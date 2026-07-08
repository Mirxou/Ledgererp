const ps = Array.from(document.querySelectorAll("p")).map(p => p.textContent.trim()).filter(t => t.length > 0);
const found = ps.filter(t => t.includes("Critical") || t.includes("High") || t.includes("Medium") || t.includes("Low") || t.includes("Total") || t.includes("Blocks") || t.includes("Deployment"));
JSON.stringify(found.slice(0, 20));