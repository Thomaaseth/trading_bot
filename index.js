const solanaWeb3 = require('@solana/web3.js');
const webSocket = require('ws');

// connect to devnet
const connection = new solanaWeb3.Connection(
    solanaWeb3.clusterApiUrl('mainnet-beta'),
    'confirmed'
);

// check connection live
async function checkConnection() {
    try {
        const version = await connection.getVersion();
        console.log('Connected to Solana cluster:', version);
    } catch (error) {
        console.error('Error connecting to Solana', error);
    }
}

// websocket setup
const ws = new webSocket('wss://api.mainnet-beta.solana.com');
ws.on('open', () => {
    console.log('websocket connection established');

    const accountPubkey = 'emhWqBszq4NzVY2E52rcB9zG3GvdNNDefqcXM2zoQjg';
    const subscriptionMessage = JSON.stringify({
             "jsonrpc": "2.0",
            "id": 1,
            "method": "accountSubscribe",
            "params": [
              accountPubkey,
              {
                "encoding": "jsonParsed",
                "commitment": "finalized"
              }
            ]
          });
          ws.send(subscriptionMessage);
    });

ws.on('message', (data) => {
    const parsedData = JSON.parse(data);
    if (parsedData.method === 'accountNotification') {
        const accountInfo = parsedData.params.result.value;
        console.log('Received account notification:', accountInfo);

        if (isBuyTransaction(accountInfo)) {
            console.log('Buy transaction detected:', accountInfo);
        }
    } else {
        console.log('Received data:', parsedData);
    }
});

ws.on('close', () => {
    console.log('WebSocket connection closed');
});

ws.on('error', (error) => {
    console.log('WebSocket error:', error);
});

// check token balances
async function getTokenBalances(accountPubkey) {
    const accountInfo = await connection.getParsedAccountInfo(new solanaWeb3.PublicKey(accountPubkey));
    const tokenBalances = {};
  
    if (accountInfo.value && accountInfo.value.data.parsed.info.tokenAmount) {
      accountInfo.value.data.parsed.info.tokenAmount.forEach(token => {
        tokenBalances[token.mint] = parseFloat(token.amount);
      });
    }
  
    return tokenBalances;
  }
  
  // Function to determine if a transaction is a buy transaction (swap)
  function isBuyTransaction(initialBalances, currentBalances) {
    let decreaseToken = null;
    let increaseToken = null;
  
    for (const token in initialBalances) {
        if (currentBalances && token in currentBalances) {
          if (initialBalances[token] > currentBalances[token]) {
            decreaseToken = token;
          } else if (initialBalances[token] < currentBalances[token]) {
            increaseToken = token;
          }
        } else {
          console.error(`Token balance for ${token} not available`);
        }
      }
  
    // A buy transaction (swap) is detected if one token decreases and another increases
    return decreaseToken && increaseToken;
  }

// call the function
checkConnection();