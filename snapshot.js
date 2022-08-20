const { BN } = polkadotUtil;
const { encodeAddress } = polkadotUtilCrypto;
const { WsProvider, ApiPromise } = polkadotApi;

// Global Variables
var global = {
	endpoint: "ws://127.0.0.1:9910",
	balances: {},
	blockNumber: 0,
	pageSize: 100,
	chainDecimals: 18,
	chainToken: "UNIT",
	lastKey: "",
	lastCount: 0,
};

// Convert a big number balance to expected float with correct units.
function toUnit(balance, decimals) {
	base = new BN(10).pow(new BN(decimals));
	dm = new BN(balance).divmod(base);
	return parseFloat(dm.div.toString() + "." + dm.mod.toString())
}

// Connect to Substrate endpoint
async function connect() {
	const provider = new WsProvider(global.endpoint);
	document.getElementById('output').innerHTML = 'Connecting to Endpoint...';
	let api = await ApiPromise.create({ provider });
	let blockHash = await api.rpc.chain.getBlockHash(global.blockNumber);
	document.getElementById('output').innerHTML = `Block Number: ${global.blockNumber} Block Hash: ${blockHash}\n`;
	window.substrate = await api.at(blockHash);
	global.chainDecimals = substrate.registry.chainDecimals;
	global.chainToken = substrate.registry.chainToken;
	document.getElementById('output').innerHTML = 'Connected\n';
}

// Create a table with the index information
function createTable() {
	document.getElementById('output').innerHTML = "Creating Table...";

	let keys = ["#", "AccountId", "Free", "Reserved", "Total"];

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
		// Get address from input
		const newBlockNumber = parseInt(document.getElementById('blockNumber').value);
		const newEndpoint = document.getElementById('endpoint').value;

		// Reset the data when reading a new block or endpoint.
		if (global.blockNumber != newBlockNumber || global.endpoint != newEndpoint) {
			global.balances = {};
			global.lastKey = "";
			global.lastCount = 0;
		}

		global.blockNumber = newBlockNumber;
		global.endpoint = newEndpoint;
		global.pageSize = parseInt(document.getElementById("pageSize").value);

		await connect();

		let all_accounts = [];
		if (global.pageSize == 0) {
			// This will be a long query...
			document.getElementById('output').innerHTML = "Querying all users... this may take a while.";
			all_accounts = await substrate.query.system.account.entries();
		} else {
			document.getElementById('output').innerHTML = `Querying ${global.pageSize} users... please wait.`;
			all_accounts = await substrate.query.system.account.entriesPaged({ args: [], pageSize: global.pageSize, startKey: global.lastKey });
		}

		for (const account of all_accounts) {
			let address = encodeAddress(account[0].slice(-32));
			let free = account[1].data.free;
			let reserved = account[1].data.reserved;
			global.lastCount += 1;
			global.balances[address] = {
				"#": global.lastCount,
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
