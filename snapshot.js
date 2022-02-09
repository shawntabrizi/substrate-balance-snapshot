const { BN } = polkadotUtil;
const { encodeAddress } = polkadotUtilCrypto;
const { WsProvider, ApiPromise } = polkadotApi;

// Global Variables
var global = {
	balances: {},
	blocknumber: 0,
	pageSize: 100,
	chainDecimals: 18,
	chainToken: "UNIT",
	lastKey: "",
};

// Convert a big number balance to expected float with correct units.
function toUnit(balance, decimals) {
	base = new BN(10).pow(new BN(decimals));
	dm = new BN(balance).divmod(base);
	return parseFloat(dm.div.toString() + "." + dm.mod.toString())
}

// Connect to Substrate endpoint
async function connect() {
	let endpoint = document.getElementById('endpoint').value;
	if (!window.substrate || global.endpoint != endpoint) {
		const provider = new WsProvider(endpoint);
		document.getElementById('output').innerHTML = 'Connecting to Endpoint...';
		window.substrate = await ApiPromise.create({ provider });
		global.endpoint = endpoint;
		global.chainDecimals = substrate.registry.chainDecimals;
		global.chainToken = substrate.registry.chainToken;
		document.getElementById('output').innerHTML = 'Connected';
	}
}

// Create a table with the index information
function createTable() {
	document.getElementById('output').innerHTML = "Creating Table...";

	let keys = ["AccountId", "Free", "Reserved", "Total"];

	let table = document.getElementById('table');

	// Clear table
	while (table.firstChild) {
		table.removeChild(table.firstChild);
	}

	let thead = document.createElement('thead');
	let tbody = document.createElement('tbody');

	let tr = document.createElement('tr');
	for (key of keys) {
		let th = document.createElement('th');
		th.innerText = key;
		tr.appendChild(th);
	}

	for (index of Object.keys(global.balances)) {
		let tr2 = document.createElement('tr');

		for (key of keys) {
			let td = document.createElement('td');
			td.innerText = global.balances[index][key];
			tr2.appendChild(td);
		}
		tbody.appendChild(tr2);
	}

	thead.appendChild(tr);
	table.appendChild(thead);
	table.appendChild(tbody);

	document.getElementById('output').innerHTML = "Done.";
}

// Main function
async function takeSnapshot() {
	try {
		await connect();

		// Get address from input
		global.blocknumber = parseInt(document.getElementById('blocknumber').value);
		global.pageSize = parseInt(document.getElementById("pageSize").value);

		let all_accounts = [];
		if (global.pageSize == 0) {
			// This will be a long query...
			document.getElementById('output').innerHTML = "Querying all users... this may take a while.";
			all_accounts = await substrate.query.system.account.entries();
		} else {
			document.getElementById('output').innerHTML = `Querying ${global.pageSize} users... please wait.`;
			all_accounts = await substrate.query.system.account.entriesPaged({ args: [], pageSize: global.pageSize, startKey: global.lastKey });
		}

		for (account of all_accounts) {
			let address = encodeAddress(account[0].slice(-32));
			let free = account[1].data.free;
			let reserved = account[1].data.reserved;
			global.balances[address] = {
				"AccountId": address,
				"Free": toUnit(free, global.chainDecimals),
				"Reserved": toUnit(reserved, global.chainDecimals),
				"Total": toUnit(free.add(reserved), global.chainDecimals),
			};
			global.lastKey = account[0].toString();
		}

		createTable();
	} catch (error) {
		document.getElementById('output').innerHTML = error;
	}
}
