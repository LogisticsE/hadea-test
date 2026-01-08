const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory data for testing (will be replaced with Azure SQL later)
const sites = [
  { id: 1, name: 'Amsterdam Medical Center', address: 'Meibergdreef 9', city: 'Amsterdam', postalCode: '1105 AZ', country: 'Netherlands', contactName: 'Dr. van der Berg', contactPhone: '+31 20 566 9111' },
  { id: 2, name: 'Berlin University Hospital', address: 'Charitéplatz 1', city: 'Berlin', postalCode: '10117', country: 'Germany', contactName: 'Dr. Schmidt', contactPhone: '+49 30 450 50' },
  { id: 3, name: 'Paris Clinical Research', address: '47 Boulevard de l\'Hôpital', city: 'Paris', postalCode: '75013', country: 'France', contactName: 'Dr. Dubois', contactPhone: '+33 1 42 16 00 00' }
];

const labs = [
  { id: 1, name: 'Central Lab Rotterdam', address: 'Gravendijkwal 230', city: 'Rotterdam', postalCode: '3015 CE', country: 'Netherlands', contactName: 'Lab Receiving', contactPhone: '+31 10 704 0704' },
  { id: 2, name: 'BioAnalytics Munich', address: 'Marchioninistraße 15', city: 'Munich', postalCode: '81377', country: 'Germany', contactName: 'Sample Processing', contactPhone: '+49 89 4400 0' }
];

const kitTypes = [
  { id: 1, name: 'Blood Collection Kit', description: 'Standard venipuncture kit with EDTA tubes', weight: 0.5 },
  { id: 2, name: 'Urine Collection Kit', description: '24-hour urine collection container', weight: 0.3 },
  { id: 3, name: 'Biopsy Kit', description: 'Tissue sample collection and preservation kit', weight: 0.8 }
];

const shipments = [];
let shipmentIdCounter = 1000;

// Main HTML page
const mainPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shipment Booking System</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            background: #f5f5f5;
        }
        h1 { color: #0078d4; }
        .container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .full-width { grid-column: 1 / -1; }
        h2 { margin-top: 0; color: #333; border-bottom: 2px solid #0078d4; padding-bottom: 10px; }
        label { display: block; margin: 10px 0 5px; font-weight: 500; }
        select, input { 
            width: 100%; 
            padding: 10px; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            font-size: 14px;
        }
        button { 
            background: #0078d4; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 14px;
            margin-top: 15px;
        }
        button:hover { background: #006abc; }
        .btn-secondary { background: #6c757d; }
        .btn-secondary:hover { background: #5a6268; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .badge { 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 12px; 
            font-weight: 500;
        }
        .badge-outbound { background: #d4edda; color: #155724; }
        .badge-sample { background: #cce5ff; color: #004085; }
        .status { color: #666; font-style: italic; }
        .info-box { background: #e7f3ff; padding: 15px; border-radius: 4px; margin-bottom: 15px; }
        .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>🚚 Shipment Booking System</h1>
    <p class="status">Connected to: Azure App Service (Test Environment)</p>
    
    <div class="container">
        <div class="card">
            <h2>📦 Book Outbound Shipment</h2>
            <p>Ship consumable kits TO a site</p>
            <form id="outboundForm">
                <label>Select Site (Destination)</label>
                <select name="siteId" id="outboundSite" required>
                    <option value="">-- Select Site --</option>
                </select>
                
                <label>Select Kit Type</label>
                <select name="kitTypeId" id="outboundKit" required>
                    <option value="">-- Select Kit --</option>
                </select>
                
                <label>Quantity</label>
                <input type="number" name="quantity" min="1" value="1" required>
                
                <label>Requested Delivery Date</label>
                <input type="date" name="requestedDate" required>
                
                <button type="submit">Book Outbound Shipment</button>
            </form>
            <div id="outboundResult"></div>
        </div>

        <div class="card">
            <h2>🧪 Book Sample Shipment</h2>
            <p>Ship used kits with samples TO a lab</p>
            <form id="sampleForm">
                <label>Select Site (Origin)</label>
                <select name="siteId" id="sampleSite" required>
                    <option value="">-- Select Site --</option>
                </select>
                
                <label>Select Lab (Destination)</label>
                <select name="labId" id="sampleLab" required>
                    <option value="">-- Select Lab --</option>
                </select>
                
                <label>Select Kit Type</label>
                <select name="kitTypeId" id="sampleKit" required>
                    <option value="">-- Select Kit --</option>
                </select>
                
                <label>Number of Samples</label>
                <input type="number" name="quantity" min="1" value="1" required>
                
                <label>Collection Date</label>
                <input type="date" name="collectionDate" required>
                
                <button type="submit">Book Sample Shipment</button>
            </form>
            <div id="sampleResult"></div>
        </div>

        <div class="card full-width">
            <h2>📋 Recent Shipments</h2>
            <button onclick="loadShipments()" class="btn-secondary">Refresh</button>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Kit</th>
                        <th>Qty</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody id="shipmentsTable">
                    <tr><td colspan="7" style="text-align: center;">No shipments yet</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // Load initial data
        async function loadData() {
            const [sitesRes, labsRes, kitsRes] = await Promise.all([
                fetch('/api/sites').then(r => r.json()),
                fetch('/api/labs').then(r => r.json()),
                fetch('/api/kit-types').then(r => r.json())
            ]);

            // Populate site dropdowns
            const siteOptions = sitesRes.map(s => \`<option value="\${s.id}">\${s.name} - \${s.city}</option>\`).join('');
            document.getElementById('outboundSite').innerHTML = '<option value="">-- Select Site --</option>' + siteOptions;
            document.getElementById('sampleSite').innerHTML = '<option value="">-- Select Site --</option>' + siteOptions;

            // Populate lab dropdown
            const labOptions = labsRes.map(l => \`<option value="\${l.id}">\${l.name} - \${l.city}</option>\`).join('');
            document.getElementById('sampleLab').innerHTML = '<option value="">-- Select Lab --</option>' + labOptions;

            // Populate kit dropdowns
            const kitOptions = kitsRes.map(k => \`<option value="\${k.id}">\${k.name}</option>\`).join('');
            document.getElementById('outboundKit').innerHTML = '<option value="">-- Select Kit --</option>' + kitOptions;
            document.getElementById('sampleKit').innerHTML = '<option value="">-- Select Kit --</option>' + kitOptions;

            loadShipments();
        }

        async function loadShipments() {
            const res = await fetch('/api/shipments');
            const shipments = await res.json();
            
            if (shipments.length === 0) {
                document.getElementById('shipmentsTable').innerHTML = '<tr><td colspan="7" style="text-align: center;">No shipments yet</td></tr>';
                return;
            }

            document.getElementById('shipmentsTable').innerHTML = shipments.map(s => \`
                <tr>
                    <td><strong>\${s.id}</strong></td>
                    <td><span class="badge \${s.type === 'outbound' ? 'badge-outbound' : 'badge-sample'}">\${s.type}</span></td>
                    <td>\${s.fromName || 'Warehouse'}</td>
                    <td>\${s.toName}</td>
                    <td>\${s.kitName}</td>
                    <td>\${s.quantity}</td>
                    <td>\${s.date}</td>
                </tr>
            \`).join('');
        }

        // Handle outbound form
        document.getElementById('outboundForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = new FormData(e.target);
            const data = Object.fromEntries(form);
            
            const res = await fetch('/api/shipments/outbound', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            document.getElementById('outboundResult').innerHTML = \`<div class="success">✅ Shipment \${result.id} created successfully!</div>\`;
            e.target.reset();
            loadShipments();
        });

        // Handle sample form
        document.getElementById('sampleForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = new FormData(e.target);
            const data = Object.fromEntries(form);
            
            const res = await fetch('/api/shipments/sample', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            document.getElementById('sampleResult').innerHTML = \`<div class="success">✅ Shipment \${result.id} created successfully!</div>\`;
            e.target.reset();
            loadShipments();
        });

        // Set default dates
        document.querySelector('input[name="requestedDate"]').valueAsDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        document.querySelector('input[name="collectionDate"]').valueAsDate = new Date();

        loadData();
    </script>
</body>
</html>
`;

// Routes
app.get('/', (req, res) => {
    res.send(mainPage);
});

// API endpoints
app.get('/api/sites', (req, res) => {
    res.json(sites);
});

app.get('/api/labs', (req, res) => {
    res.json(labs);
});

app.get('/api/kit-types', (req, res) => {
    res.json(kitTypes);
});

app.get('/api/shipments', (req, res) => {
    res.json(shipments);
});

// Create outbound shipment (kits to site)
app.post('/api/shipments/outbound', (req, res) => {
    const { siteId, kitTypeId, quantity, requestedDate } = req.body;
    const site = sites.find(s => s.id === parseInt(siteId));
    const kit = kitTypes.find(k => k.id === parseInt(kitTypeId));
    
    const shipment = {
        id: `SHP-${shipmentIdCounter++}`,
        type: 'outbound',
        fromName: 'Central Warehouse',
        toName: site?.name,
        toCity: site?.city,
        kitName: kit?.name,
        quantity: parseInt(quantity),
        date: requestedDate,
        createdAt: new Date().toISOString()
    };
    
    shipments.unshift(shipment);
    res.json(shipment);
});

// Create sample shipment (samples from site to lab)
app.post('/api/shipments/sample', (req, res) => {
    const { siteId, labId, kitTypeId, quantity, collectionDate } = req.body;
    const site = sites.find(s => s.id === parseInt(siteId));
    const lab = labs.find(l => l.id === parseInt(labId));
    const kit = kitTypes.find(k => k.id === parseInt(kitTypeId));
    
    const shipment = {
        id: `SMP-${shipmentIdCounter++}`,
        type: 'sample',
        fromName: site?.name,
        fromCity: site?.city,
        toName: lab?.name,
        toCity: lab?.city,
        kitName: kit?.name,
        quantity: parseInt(quantity),
        date: collectionDate,
        createdAt: new Date().toISOString()
    };
    
    shipments.unshift(shipment);
    res.json(shipment);
});

// Health check endpoint (useful for Azure)
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`Shipment Booking App running on port ${port}`);
});
