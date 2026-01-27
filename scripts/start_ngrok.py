
import sys
import os
import time
from pyngrok import ngrok

def main():
    """
    DEVELOPMENT ONLY: Ngrok Tunnel Script
    ⚠️  WARNING: This script is for DEVELOPMENT/TESTING only!
    For production, use your real domain (ledgererp.online) with proper SSL/HTTPS.
    Do NOT use ngrok in production!
    """
    print("=" * 60)
    print("⚠️  DEVELOPMENT MODE: Ngrok Tunnel")
    print("⚠️  WARNING: This is for testing only, NOT for production!")
    print("=" * 60)
    print("Starting Ngrok Tunnel...")
    
    # Configure ngrok auth token from environment variable
    # SECURITY FIX: Use environment variable instead of hardcoded token
    ngrok_token = os.environ.get('NGROK_AUTH_TOKEN')
    if not ngrok_token:
        print("⚠️  Warning: NGROK_AUTH_TOKEN environment variable not set.")
        print("   Set it with: export NGROK_AUTH_TOKEN='your_token_here'")
        print("   Or skip this step if token is already configured via ngrok config")
        print("\n💡 Note: For production, use your real domain (ledgererp.online) instead!")
    else:
        ngrok.set_auth_token(ngrok_token)
        print("✅ Ngrok auth token configured from environment variable")
    
    # Get ngrok domain from environment variable (optional for development)
    # PRODUCTION: Use your real domain (ledgererp.online) with HTTPS
    domain = os.environ.get('NGROK_DOMAIN')  # Optional, can be None
    port = int(os.environ.get('PORT', 8000))
    
    if not domain:
        print("ℹ️  No NGROK_DOMAIN set, using random ngrok domain")
        print("   Set NGROK_DOMAIN environment variable for custom domain")
    
    try:
        # Start ngrok tunnel
        # Note: If no auth token is set, this might fail with a specific error
        # which we can catch and advise the user.
        if domain:
            listener = ngrok.connect(port, domain=domain)
            print(f"\n✅ Ngrok Tunnel Established (custom domain): {listener.public_url}")
        else:
            listener = ngrok.connect(port)
            print(f"\n✅ Ngrok Tunnel Established (random domain): {listener.public_url}")
        
        print(f"➡️  Forwarding to: http://localhost:{port}")
        print(f"\n⚠️  REMINDER: This is for DEVELOPMENT only!")
        print(f"   For production, use: https://ledgererp.online")
        print(f"\nPress Ctrl+C to stop the tunnel...")
        
        # Keep the script running
        ngrok_process = ngrok.get_ngrok_process()
        ngrok_process.proc.wait()
        
    except KeyboardInterrupt:
        print("\nStopping Ngrok...")
        ngrok.kill()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error starting ngrok: {e}")
        print("\nPossible solutions:")
        print("1. Ensure your authtoken is configured: ngrok config add-authtoken <TOKEN>")
        print("2. Verify the domain is reserved in your Ngrok dashboard.")
        sys.exit(1)

if __name__ == "__main__":
    main()
