// File: frontend/js/app.js
$(document).ready(function(){
    // Use provider if available; if not, use Holesky RPC endpoint.
    if (typeof web3 !== 'undefined') {
      web3 = new Web3(web3.currentProvider);
      debugMessage("Using injected Web3 provider.");
    } else {
      web3 = new Web3("https://holesky.drpc.org/");
      debugMessage("Using Holesky RPC endpoint.");
    }
  
    // Global variables – update ticketTokenAddress with your deployed contract address.
    const ticketTokenAddress = "0xf741f5DF18BEb11E375b0398605076359Ab7d0F4";  // Use the actual contract address
    const vendorAddress = "0x7Ce9561B0A5448e5b5BDDE3588E67FA861F4a18F";

    // Extended ABI: update to match the new contract functions
    const ticketTokenABI = [
      {
        "inputs": [
          {"internalType":"string","name":"_name","type":"string"},
          {"internalType":"string","name":"_symbol","type":"string"},
          {"internalType":"uint8","name":"_decimals","type":"uint8"},
          {"internalType":"uint256","name":"_initialSupply","type":"uint256"},
          {"internalType":"uint256","name":"_ticketPrice","type":"uint256"},
          {"internalType":"address","name":"_vendor","type":"address"}
        ],
        "stateMutability":"nonpayable",
        "type":"constructor"
      },
      {
        "inputs":[],
        "name":"buyTicket",
        "outputs":[{"internalType":"bool","name":"success","type":"bool"}],
        "stateMutability":"payable",
        "type":"function"
      },
      {
        "inputs":[],
        "name": "ticketPrice",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type":"function"
      },
      {
        "inputs":[],
        "name":"name",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability":"view",
        "type":"function"
      },
      {
        "inputs": [{"internalType":"address","name":"","type":"address"}],
        "name":"balanceOf",
        "outputs": [{"internalType":"uint256","name":"","type":"uint256"}],
        "stateMutability":"view",
        "type":"function"
      },
      {
        "inputs": [
          {"internalType":"address","name":"_to","type":"address"},
          {"internalType":"uint256","name":"_value","type":"uint256"}
        ],
        "name":"transfer",
        "outputs": [{"internalType":"bool","name":"","type":"bool"}],
        "stateMutability":"nonpayable",
        "type":"function"
      }
    ];
  
    // Debug function writes messages to console and to UI.
    function debugMessage(message) {
      console.log(message);
      $("#debugMessages").append("<p>" + message + "</p>");
    }
  
    // Function to open a tab
    window.openTab = function(evt, tabName) {
      $(".tabcontent").removeClass("active");
      $("#" + tabName).addClass("active");
      debugMessage("Switched to tab: " + tabName);
    };
  
    // Open default tab
    openTab(null, 'createWallet');
  
    // Close error modal
    $("#closeModal").click(function(){
      $("#errorModal").hide();
      debugMessage("Closed modal.");
    });
  
    // Create Wallet functionality
    $("#createWalletBtn").click(function(){
      const password = $("#walletPassword").val();
      if (!password) {
        showError("Please enter a password.");
        return;
      }
      const account = web3.eth.accounts.create();
      $("#walletAddress").val(account.address);
      $("#walletPrivateKey").val(account.privateKey);
      const keystore = web3.eth.accounts.encrypt(account.privateKey, password);
      $("#walletKeystore").val(JSON.stringify(keystore, null, 2));
      debugMessage("Wallet created: " + account.address);
    });
  
    // Download Keystore functionality
    $("#downloadKeystore").click(function(){
      const keystoreText = $("#walletKeystore").val();
      if (!keystoreText) {
        showError("Please create a wallet first.");
        return;
      }
      const blob = new Blob([keystoreText], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = $("#walletAddress").val() + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      debugMessage("Keystore downloaded.");
    });
  
    // Check Balance functionality with improved error handling
    $("#checkBalanceBtn").click(function(){
      const walletAddress = $("#balanceWalletAddress").val();
      if (!web3.utils.isAddress(walletAddress)) {
        showError("Invalid wallet address.");
        return;
      }
      
      // Clear previous values
      $("#tokenBalance").text("Loading...");
      $("#tokenName").text("Loading...");
      $("#ticketPrice").text("Loading...");
      
      debugMessage("Connecting to contract at " + ticketTokenAddress);
      
      // Get ETH balance
      web3.eth.getBalance(walletAddress)
        .then(function(balance){
          const balanceInEther = web3.utils.fromWei(balance, "ether");
          $("#cryptoBalance").text(balanceInEther);
          debugMessage("Fetched ETH balance: " + balanceInEther + " ETH");
        })
        .catch(function(error){
          showError("Could not retrieve ETH balance: " + error.message);
          $("#cryptoBalance").text("Error");
        });
        
      try {
        // Get Ticket Token balance from the deployed contract
        const tokenContract = new web3.eth.Contract(ticketTokenABI, ticketTokenAddress);
        
        // Get token balance
        tokenContract.methods.balanceOf(walletAddress).call()
          .then(function(balance){
            $("#tokenBalance").text(balance);
            debugMessage("Fetched ticket token balance: " + balance);
          })
          .catch(function(error){
            debugMessage("Error getting token balance: " + error.message);
            $("#tokenBalance").text("Error");
          });
          
        // Get the token name
        tokenContract.methods.name().call()
          .then(function(name){
            $("#tokenName").text(name);
            debugMessage("Token name: " + name);
          })
          .catch(function(error){
            debugMessage("Error getting token name: " + error.message);
            $("#tokenName").text("Error");
          });
          
        // Get ticket price
        tokenContract.methods.ticketPrice().call()
          .then(function(priceInWei){
            const priceInEth = web3.utils.fromWei(priceInWei, "ether");
            $("#ticketPrice").text(priceInEth);
            debugMessage("Current ticket price: " + priceInEth + " ETH");
          })
          .catch(function(error){
            debugMessage("Error getting ticket price: " + error.message);
            $("#ticketPrice").text("Error");
          });
      } catch (error) {
        debugMessage("Contract connection error: " + error.message);
        showError("Failed to connect to token contract. Check console for details.");
      }
    });
  
    // Load wallet for Buy Ticket tab
    $("#loadBuyWalletBtn").click(function(){
      const password = $("#buyWalletPassword").val();
      const file = $("#buyKeystoreFile")[0].files[0];
      if (!password) {
        showError("Enter wallet password for decryption.");
        return;
      }
      if (!file) {
        showError("Select a keystore file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const keystore = JSON.parse(e.target.result);
          const account = web3.eth.accounts.decrypt(keystore, password);
          $("#buyWalletAddress").val(account.address);
          $("#buyPrivateKey").val(account.privateKey);
          debugMessage("Loaded wallet for buying: " + account.address);
        } catch (error) {
          showError("Failed to decrypt wallet: " + error.message);
        }
      };
      reader.readAsText(file);
    });
  
    // Buy Ticket functionality - direct contract payment
    $("#buyTicketBtn").click(async function(){
      const privateKey = $("#buyPrivateKey").val();
      if (!privateKey) {
        showError("Load your wallet first.");
        return;
      }
      const amountEth = $("#ticketAmount").val();
      if (!amountEth || parseFloat(amountEth) <= 0) {
        showError("Enter a valid ETH amount.");
        return;
      }
      
      debugMessage("--- STARTING TICKET PURCHASE PROCESS ---");
      
      try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        debugMessage("Buyer wallet: " + account.address);
        
        const tokenContract = new web3.eth.Contract(ticketTokenABI, ticketTokenAddress);
        debugMessage("Connected to contract at: " + ticketTokenAddress);
        
        // Single step: Send ETH to contract's buyTicket function
        debugMessage("Sending " + amountEth + " ETH to buy ticket");
        
        const buyTx = {
          from: account.address,
          to: ticketTokenAddress,
          gas: 200000,
          value: web3.utils.toWei(amountEth, "ether"),
          data: tokenContract.methods.buyTicket().encodeABI()
        };
        
        $("#buyTxRequest").val(JSON.stringify(buyTx, null, 2));
        debugMessage("Buy transaction created: " + JSON.stringify(buyTx));
        
        const signedBuyTx = await web3.eth.accounts.signTransaction(buyTx, privateKey);
        debugMessage("Buy transaction signed");
        
        debugMessage("Sending buy transaction...");
        const buyReceipt = await web3.eth.sendSignedTransaction(signedBuyTx.rawTransaction);
        debugMessage("Ticket purchased! Transaction hash: " + buyReceipt.transactionHash);
        
        $("#buyTxReceipt").val(JSON.stringify(buyReceipt, null, 2));
        debugMessage("--- TICKET PURCHASE COMPLETE ---");
        
      } catch (error) {
        debugMessage("ERROR: " + error.message);
        if (error.receipt) {
          debugMessage("ERROR RECEIPT: " + JSON.stringify(error.receipt, null, 2));
        }
        console.error("Full error:", error);
        showError("Transaction failed: " + error.message);
      }
    });
  
    // Load wallet for Transfer Ticket tab
    $("#loadTransferWalletBtn").click(function(){
      const password = $("#transferWalletPassword").val();
      const file = $("#transferKeystoreFile")[0].files[0];
      if (!password) {
        showError("Enter wallet password for decryption.");
        return;
      }
      if (!file) {
        showError("Select a keystore file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const keystore = JSON.parse(e.target.result);
          const account = web3.eth.accounts.decrypt(keystore, password);
          $("#transferWalletAddress").val(account.address);
          $("#transferPrivateKey").val(account.privateKey);
          debugMessage("Loaded wallet for transferring: " + account.address);
        } catch (error) {
          showError("Failed to decrypt wallet: " + error.message);
        }
      };
      reader.readAsText(file);
    });
  
    // Transfer Ticket functionality – call the contract's transfer method.
    $("#transferTicketBtn").click(function(){
      const privateKey = $("#transferPrivateKey").val();
      if (!privateKey) {
        showError("Load your wallet first.");
        return;
      }
      const transferAmount = $("#transferAmount").val();
      if (!transferAmount || parseInt(transferAmount) <= 0) {
        showError("Enter a valid ticket amount.");
        return;
      }
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      const tokenContract = new web3.eth.Contract(ticketTokenABI, ticketTokenAddress);
      // Call transfer() on the contract; pass the vendor address as parameter.
      const data = tokenContract.methods.transfer(vendorAddress, transferAmount).encodeABI();
      const tx = {
        from: account.address,
        to: ticketTokenAddress,
        gas: 200000,
        data: data
      };
      $("#transferTxRequest").val(JSON.stringify(tx, null, 2));
      debugMessage("Initiating ticket transfer of " + transferAmount + " tokens to vendor.");
      web3.eth.accounts.signTransaction(tx, privateKey)
        .then(function(signedTx){
          return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        })
        .then(function(receipt){
          $("#transferTxReceipt").val(JSON.stringify(receipt, null, 2));
          debugMessage("Ticket transfer successful. Receipt received.");
        })
        .catch(function(error){
          showError("Transaction failed: " + error.message);
        });
    });
  
    function showError(message) {
      $("#errorMessage").text(message);
      $("#errorModal").show();
      debugMessage("Error: " + message);
    }
});
