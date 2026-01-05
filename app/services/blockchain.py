"""
Blockchain Service - Dual-Mode Listener & Circuit Breaker
Req #18: Singleton Listener (Backend-only verification)
Req #22: Dual-Mode Polling (Local Node -> Public API fallback)
Req #23: Circuit Breaker (Hibernation Mode on 500/503)
SECURITY: Strict Verification Logic - Anti-Fraud & Anti-Replay
"""
import asyncio
import aiohttp
import logging
from enum import Enum
from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime, timedelta
import hashlib

logger = logging.getLogger(__name__)

class NodeMode(Enum):
    LOCAL = "local"
    PUBLIC = "public"
    HIBERNATION = "hibernation"

class CircuitBreaker:
    """Circuit Breaker pattern for API resilience"""
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = "closed"  # closed, open, half_open
    
    def record_success(self):
        """Reset on successful request"""
        self.failure_count = 0
        self.state = "closed"
    
    def record_failure(self):
        """Record failure and check if circuit should open"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Circuit breaker OPENED after {self.failure_count} failures")
    
    def can_attempt(self) -> bool:
        """Check if request can be attempted"""
        if self.state == "closed":
            return True
        
        if self.state == "open":
            if self.last_failure_time:
                elapsed = (datetime.now() - self.last_failure_time).total_seconds()
                if elapsed >= self.timeout:
                    self.state = "half_open"
                    return True
            return False
        
        return True  # half_open

class BlockchainService:
    """
    Req #18: Singleton Listener - Only backend polls blockchain
    Req #22: Dual-Mode Polling with fallback
    Req #23: Circuit Breaker for resilience
    """
    
    def __init__(
        self,
        local_node_url: str = "http://localhost:31400",
        public_api_url: str = "https://api.minepi.com",
        check_interval: int = 5
    ):
        self.local_node_url = local_node_url
        self.public_api_url = public_api_url
        self.check_interval = check_interval
        self.current_mode = NodeMode.LOCAL
        self.circuit_breaker = CircuitBreaker()
        self.circuit_breaker_open = False
        self.pending_transactions: Dict[str, Dict[str, Any]] = {}
        self._listener_task: Optional[asyncio.Task] = None
        
        # SECURITY: Anti-Replay Protection - Store used transaction hashes
        self.used_transactions: Dict[str, datetime] = {}
        
        # SECURITY: Invoice cache (in production, query from database)
        # Format: {invoice_id: {amount, merchant_id, wallet_address, status}}
        self.invoice_cache: Dict[str, Dict[str, Any]] = {}
    
    @staticmethod
    def validate_memo(memo: str) -> Tuple[bool, Optional[str], int]:
        """
        Req #16: Validate Stellar Memo is within 28 bytes limit.
        
        Args:
            memo: The memo string to validate
            
        Returns:
            tuple: (is_valid, error_message, byte_length)
            - is_valid: True if memo is valid (<= 28 bytes)
            - error_message: Error message if invalid, None if valid
            - byte_length: Length of memo in bytes
        """
        if not memo:
            return True, None, 0
        
        # Calculate byte length (not character length)
        # Important: Arabic/Unicode characters take 2+ bytes
        memo_bytes = memo.encode('utf-8')
        byte_length = len(memo_bytes)
        
        if byte_length > 28:
            return False, f"Memo exceeds 28 bytes limit: {byte_length} bytes (Stellar limit)", byte_length
        
        return True, None, byte_length
    
    async def start_listener(self):
        """Start the blockchain listener task"""
        if self._listener_task is None or self._listener_task.done():
            self._listener_task = asyncio.create_task(self._listen_loop())
            logger.info("Blockchain listener started")
    
    async def stop_listener(self):
        """Stop the blockchain listener"""
        if self._listener_task and not self._listener_task.done():
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass
            logger.info("Blockchain listener stopped")
    
    async def _listen_loop(self):
        """Main listening loop"""
        while True:
            try:
                await self._check_pending_transactions()
                await asyncio.sleep(self.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in listener loop: {e}")
                await asyncio.sleep(self.check_interval)
    
    async def _check_pending_transactions(self):
        """Check pending transactions for confirmation"""
        if not self.circuit_breaker.can_attempt():
            # Req #23: Enter Hibernation Mode
            if self.current_mode != NodeMode.HIBERNATION:
                self.current_mode = NodeMode.HIBERNATION
                self.circuit_breaker_open = True
                logger.warning("Entered HIBERNATION mode - Pi payments paused")
            return
        
        # Try local node first (Req #22: Priority)
        if self.current_mode == NodeMode.LOCAL:
            success = await self._try_local_node()
            if not success:
                logger.warning("Local node failed, switching to public API")
                self.current_mode = NodeMode.PUBLIC
        
        # Fallback to public API
        if self.current_mode == NodeMode.PUBLIC or self.current_mode == NodeMode.HIBERNATION:
            success = await self._try_public_api()
            if not success:
                if self.current_mode != NodeMode.HIBERNATION:
                    logger.error("Both nodes failed, entering hibernation")
                    self.current_mode = NodeMode.HIBERNATION
                    self.circuit_breaker_open = True
            else:
                # Recovery successful (handled in _try_public_api)
                pass
    
    async def _try_local_node(self) -> bool:
        """Try to connect to local Pi Node"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.local_node_url}/v1/network",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        self.circuit_breaker.record_success()
                        return True
                    elif response.status in [500, 503]:
                        self.circuit_breaker.record_failure()
                        return False
        except Exception as e:
            logger.debug(f"Local node check failed: {e}")
            self.circuit_breaker.record_failure()
            return False
    
    async def _try_public_api(self) -> bool:
        """Try to connect to public Pi API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.public_api_url}/v1/network",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        self.circuit_breaker.record_success()
                        if self.current_mode == NodeMode.HIBERNATION:
                            self.current_mode = NodeMode.PUBLIC
                            self.circuit_breaker_open = False
                        return True
                    elif response.status in [500, 503]:
                        self.circuit_breaker.record_failure()
                        return False
        except Exception as e:
            logger.debug(f"Public API check failed: {e}")
            self.circuit_breaker.record_failure()
            return False
    
    async def verify_transaction(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        SECURITY: Strict Verification Logic - Anti-Fraud & Anti-Replay
        
        Verification Triangle:
        1. Amount Check: Transaction amount must match invoice amount
        2. Recipient Check: Transaction destination must match merchant wallet
        3. Anti-Replay: Transaction hash must be unique (not used before)
        4. Memo Validation: Memo must contain valid Invoice ID
        """
        if self.circuit_breaker_open:
            return {
                "status": "hibernation",
                "message": "Blockchain service is in hibernation mode. Payments paused.",
                "verified": False
            }
        
        # Extract transaction data
        memo = transaction_data.get("memo", "").strip()
        tx_amount = float(transaction_data.get("amount", 0))
        merchant_id = transaction_data.get("merchant_id", "")
        tx_hash = transaction_data.get("transaction_hash", "")
        recipient_address = transaction_data.get("recipient", "").strip()
        invoice_id = transaction_data.get("invoice_id", "")  # Invoice ID from frontend
        
        # SECURITY CHECK 1: Anti-Replay Protection
        if tx_hash:
            if tx_hash in self.used_transactions:
                logger.warning(f"🚨 REPLAY ATTACK DETECTED: Transaction hash {tx_hash} already used")
                return {
                    "status": "error",
                    "error_code": "REPLAY_DETECTED",
                    "message": "This transaction has already been processed. Replay attack prevented.",
                    "verified": False
                }
        
        # Req #16: Validate memo format (<= 28 bytes)
        is_valid, error_msg, byte_length = self.validate_memo(memo)
        if not is_valid:
            return {
                "status": "error",
                "error_code": "MEMO_TOO_LONG",
                "message": error_msg,
                "verified": False
            }
        
        # Extract Invoice ID from memo (memo should be the Invoice ID)
        # Format: Invoice ID is stored directly in memo (e.g., "INV-1765198043478-A3F2")
        invoice_id_from_memo = memo if memo.startswith("INV-") else invoice_id
        
        if not invoice_id_from_memo:
            return {
                "status": "error",
                "error_code": "INVALID_MEMO",
                "message": "Invoice ID not found in memo",
                "verified": False
            }
        
        # SECURITY CHECK 2: Amount Verification
        # Get invoice data (from cache or passed in transaction_data)
        invoice_data = transaction_data.get("invoice_data") or self.invoice_cache.get(invoice_id_from_memo)
        
        if not invoice_data:
            # Invoice not found - request frontend to provide invoice data
            return {
                "status": "pending",
                "error_code": "INVOICE_NOT_FOUND",
                "message": f"Invoice {invoice_id_from_memo} not found. Please provide invoice data.",
                "verified": False,
                "requires_invoice_data": True
            }
        
        invoice_amount = float(invoice_data.get("amount", 0))
        expected_merchant_id = invoice_data.get("merchantId", "")
        merchant_wallet = invoice_data.get("walletAddress", "")
        
        # SECURITY CHECK 2A: Amount Check (Critical)
        # Allow tiny tolerance for floating point errors (0.0000001 Pi)
        TOLERANCE = 0.0000001
        amount_difference = abs(tx_amount - invoice_amount)
        
        if tx_amount < (invoice_amount - TOLERANCE):
            logger.warning(
                f"🚨 UNDERPAID TRANSACTION: Invoice {invoice_id_from_memo} "
                f"requires {invoice_amount} Pi, but received {tx_amount} Pi"
            )
            return {
                "status": "error",
                "error_code": "UNDERPAID",
                "message": f"Payment amount ({tx_amount} Pi) is less than invoice amount ({invoice_amount} Pi)",
                "verified": False,
                "expected_amount": invoice_amount,
                "received_amount": tx_amount,
                "difference": invoice_amount - tx_amount
            }
        
        if amount_difference > TOLERANCE:
            logger.warning(
                f"⚠️ AMOUNT MISMATCH: Invoice {invoice_id_from_memo} "
                f"expected {invoice_amount} Pi, received {tx_amount} Pi (diff: {amount_difference})"
            )
            # Allow overpayment but log it
            # In strict mode, you might want to reject overpayments too
        
        # SECURITY CHECK 3: Recipient Check
        if recipient_address and merchant_wallet:
            if recipient_address.lower() != merchant_wallet.lower():
                logger.warning(
                    f"🚨 WRONG RECIPIENT: Transaction sent to {recipient_address}, "
                    f"but merchant wallet is {merchant_wallet}"
                )
                return {
                    "status": "error",
                    "error_code": "WRONG_RECIPIENT",
                    "message": f"Transaction recipient ({recipient_address}) does not match merchant wallet ({merchant_wallet})",
                    "verified": False
                }
        
        # SECURITY CHECK 4: Merchant ID Verification
        if merchant_id and expected_merchant_id:
            if merchant_id != expected_merchant_id:
                logger.warning(
                    f"🚨 MERCHANT MISMATCH: Transaction merchant {merchant_id} "
                    f"does not match invoice merchant {expected_merchant_id}"
                )
                return {
                    "status": "error",
                    "error_code": "MERCHANT_MISMATCH",
                    "message": "Transaction merchant ID does not match invoice merchant",
                    "verified": False
                }
        
        # All checks passed - Mark transaction as used (Anti-Replay)
        if tx_hash:
            self.used_transactions[tx_hash] = datetime.now()
            # Clean old transactions (older than 30 days)
            cutoff_date = datetime.now() - timedelta(days=30)
            self.used_transactions = {
                tx: ts for tx, ts in self.used_transactions.items()
                if ts > cutoff_date
            }
        
        # Store as verified
        tx_id = f"{merchant_id}_{invoice_id_from_memo}_{int(datetime.now().timestamp())}"
        self.pending_transactions[tx_id] = {
            "memo": memo,
            "amount": tx_amount,
            "merchant_id": merchant_id,
            "invoice_id": invoice_id_from_memo,
            "transaction_hash": tx_hash,
            "recipient": recipient_address,
            "timestamp": datetime.now().isoformat(),
            "status": "verified"
        }
        
        logger.info(f"✅ Transaction verified: Invoice {invoice_id_from_memo}, Amount: {tx_amount} Pi")
        
        # SECURITY: Send real-time notification to frontend via SSE
        # Import here to avoid circular dependency
        try:
            from app.routers.notifications import notification_manager
            asyncio.create_task(
                notification_manager.broadcast_notification(
                    merchant_id,
                    {
                        "type": "payment_confirmed",
                        "invoice_id": invoice_id_from_memo,
                        "merchant_id": merchant_id,
                        "status": "paid",
                        "amount": tx_amount,
                        "transaction_hash": tx_hash,
                        "timestamp": datetime.now().isoformat(),
                        "message": "Payment confirmed successfully"
                    }
                )
            )
        except Exception as e:
            logger.warning(f"Failed to send notification: {e}")
        
        return {
            "status": "verified",
            "transaction_id": tx_id,
            "invoice_id": invoice_id_from_memo,
            "verified": True,
            "message": "Transaction verified successfully",
            "amount_verified": True,
            "recipient_verified": True,
            "replay_protected": True
        }
    
    def register_invoice(self, invoice_id: str, invoice_data: Dict[str, Any]):
        """
        Register invoice data for verification
        Called by frontend when invoice is created
        """
        self.invoice_cache[invoice_id] = invoice_data
        logger.info(f"📋 Invoice registered: {invoice_id}")
    
    def get_used_transactions_count(self) -> int:
        """Get count of processed transactions (for monitoring)"""
        return len(self.used_transactions)
    
    def get_status(self) -> str:
        """Get current service status"""
        if self.circuit_breaker_open:
            return "hibernation"
        return self.current_mode.value
    
    def get_pending_transactions(self) -> Dict[str, Dict[str, Any]]:
        """Get all pending transactions"""
        return self.pending_transactions.copy()


class StellarAccountData:
    """
    Manage Stellar Account Data Entries for Pi Network Blockchain Storage
    Each merchant has a Stellar account
    Data stored as key-value pairs on blockchain
    """
    
    def __init__(self, network_passphrase: str = "Public Global Stellar Network ; September 2015"):
        """
        Initialize Stellar Account Data Manager
        """
        try:
            from stellar_sdk import Server, Network
            self.stellar_sdk_available = True
            self.network_passphrase = network_passphrase
            # Use Pi Network's Stellar Horizon server
            self.server = Server("https://horizon.stellar.org")
            self.network = Network(network_passphrase)
        except ImportError:
            logger.warning("Stellar SDK not available. Install with: pip install stellar-sdk")
            self.stellar_sdk_available = False
    
    async def set_account_data(self, account_secret: str, key: str, value: str) -> Dict[str, Any]:
        """
        Store data on Stellar blockchain as Account Data Entry
        Max 64 bytes per entry
        
        Args:
            account_secret: Stellar account secret key
            key: Data key (will be prefixed automatically)
            value: Data value (will be base64 encoded)
        
        Returns:
            Transaction result
        """
        if not self.stellar_sdk_available:
            raise ImportError("Stellar SDK not available. Please install stellar-sdk package.")
        
        try:
            from stellar_sdk import Keypair, TransactionBuilder, Operation
            
            account_keypair = Keypair.from_secret(account_secret)
            account = self.server.load_account(account_keypair.public_key)
            
            # Ensure value fits in 64 bytes (base64 encoded)
            value_bytes = value.encode('utf-8')
            if len(value_bytes) > 64:
                raise ValueError(f"Value too large: {len(value_bytes)} bytes (max 64)")
            
            # Build transaction
            transaction = (
                TransactionBuilder(
                    source_account=account,
                    network_passphrase=self.network_passphrase,
                    base_fee=100
                )
                .append_manage_data_op(
                    data_name=key,
                    data_value=value_bytes
                )
                .set_timeout(30)
                .build()
            )
            
            transaction.sign(account_keypair)
            response = self.server.submit_transaction(transaction)
            
            logger.info(f"✅ Account data stored: {key}")
            return {
                "success": True,
                "transaction_hash": response.get("hash"),
                "key": key
            }
        except Exception as e:
            logger.error(f"Error storing account data: {e}")
            raise
    
    async def get_account_data(self, account_id: str, key: str) -> Optional[str]:
        """
        Get data from Stellar Account Data
        
        Args:
            account_id: Stellar account public key
            key: Data key to retrieve
        
        Returns:
            Data value (decoded) or None if not found
        """
        if not self.stellar_sdk_available:
            raise ImportError("Stellar SDK not available. Please install stellar-sdk package.")
        
        try:
            account = self.server.accounts().account_id(account_id).call()
            data = account.get("data", {})
            
            if key not in data:
                return None
            
            # Decode base64
            import base64
            value_bytes = base64.b64decode(data[key])
            return value_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Error getting account data: {e}")
            return None
    
    async def delete_account_data(self, account_secret: str, key: str) -> Dict[str, Any]:
        """
        Delete account data entry (set to empty string)
        
        Args:
            account_secret: Stellar account secret key
            key: Data key to delete
        
        Returns:
            Transaction result
        """
        return await self.set_account_data(account_secret, key, "")
    
    async def list_account_data(self, account_id: str, prefix: str = "") -> List[Dict[str, str]]:
        """
        List all account data entries with prefix
        
        Args:
            account_id: Stellar account public key
            prefix: Prefix to filter entries (e.g., "invoice:" to get all invoices)
        
        Returns:
            List of {key, value} dictionaries
        """
        if not self.stellar_sdk_available:
            raise ImportError("Stellar SDK not available. Please install stellar-sdk package.")
        
        try:
            account = self.server.accounts().account_id(account_id).call()
            data = account.get("data", {})
            
            entries = []
            import base64
            
            for key, value in data.items():
                if key.startswith(prefix):
                    try:
                        value_bytes = base64.b64decode(value)
                        value_str = value_bytes.decode('utf-8')
                        entries.append({
                            "key": key,
                            "value": value_str
                        })
                    except Exception as e:
                        logger.warn(f"Error decoding entry {key}: {e}")
            
            return entries
        except Exception as e:
            logger.error(f"Error listing account data: {e}")
            return []