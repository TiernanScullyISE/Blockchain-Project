// File: frontend/js/app.js
$(document).ready(function(){
    // Initialize Web3 - use your Infura endpoint or other provider
    const web3 = new Web3(new Web3.providers.HttpProvider("https://rpc.ankr.com/eth_holesky"));
    // Contract Address and Vendor Address
    const ticketTokenAddress = "0xaF708B08eb87a6001A81107F7e0215e2F583A255"; // Replace with your deployed contract address
    const vendorAddress = "0x7Ce9561B0A5448e5b5BDDE3588E67FA861F4a18F"; // Vendor/Doorman address

    // Updated ABI: Reflects the new buyTicket function signature
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
      { // Event definition
        "anonymous": false,
        "inputs": [
          {"indexed":true,"internalType":"address","name":"buyer","type":"address"},
          {"indexed":false,"internalType":"uint256","name":"tokenAmount","type":"uint256"},
          {"indexed":false,"internalType":"uint256","name":"amountETH","type":"uint256"}
        ],
        "name":"TicketPurchased",
        "type":"event"
      },
      { // Event definition
        "anonymous": false,
        "inputs": [
          {"indexed":true,"internalType":"address","name":"from","type":"address"},
          {"indexed":true,"internalType":"address","name":"to","type":"address"},
          {"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}
        ],
        "name":"Transfer",
        "type":"event"
      },
      { // Updated buyTicket function signature
        "inputs": [{"internalType":"uint256","name":"_amount","type":"uint256"}],
        "name":"buyTicket",
        "outputs":[{"internalType":"bool","name":"success","type":"bool"}],
        "stateMutability":"payable",
        "type":"function"
      },
      { // balanceOf remains the same
        "inputs": [{"internalType":"address","name":"","type":"address"}],
        "name":"balanceOf",
        "outputs": [{"internalType":"uint256","name":"","type":"uint256"}],
        "stateMutability":"view",
        "type":"function"
      },
      { // decimals remains the same
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
      },
      { // name remains the same
        "inputs":[],
        "name":"name",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability":"view",
        "type":"function"
      },
      { // symbol remains the same
        "inputs": [],
        "name": "symbol",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      { // ticketPrice remains the same
        "inputs":[],
        "name": "ticketPrice",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type":"function"
      },
      { // totalSupply remains the same
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      { // transfer remains the same
        "inputs": [
          {"internalType":"address","name":"_to","type":"address"},
          {"internalType":"uint256","name":"_value","type":"uint256"}
        ],
        "name":"transfer",
        "outputs": [{"internalType":"bool","name":"","type":"bool"}],
        "stateMutability":"nonpayable",
        "type":"function"
      },
      { // vendor remains the same
        "inputs": [],
        "name": "vendor",
        "outputs": [{"internalType": "address payable", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      },
      { // withdraw remains the same
        "inputs": [],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      { // receive remains the same
        "stateMutability": "payable",
        "type": "receive"
      }
    ];
  
    // Debug function writes messages to console and to UI.
    function debugMessage(message) {
      console.log(message);
      $("#debugMessages").append("<p>" + new Date().toLocaleTimeString() + ": " + message + "</p>");
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
      $("#cryptoBalance").text("Loading...");
      $("#tokenBalance").text("Loading...");
      $("#tokenName").text("Loading...");
      $("#ticketPrice").text("Loading...");
      
      debugMessage("Checking balance for: " + walletAddress);
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
            $("#tokenBalance").text(balance.toString());
            debugMessage("Fetched ticket token balance: " + balance.toString());
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
  
    // Buy Ticket functionality
    $("#buyTicketBtn").click(async function(){
      const privateKey = $("#buyPrivateKey").val();
      if (!privateKey) {
        showError("Load your wallet first.");
        return;
      }
      
      const numTickets = $("#numTicketsToBuy").val();
      if (!numTickets || parseInt(numTickets) <= 0) {
        showError("Enter a valid number of tickets to buy.");
        return;
      }
      
      debugMessage(`--- STARTING TICKET PURCHASE PROCESS for ${numTickets} tickets ---`);
      
      try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        debugMessage("Buyer wallet: " + account.address);
        
        // First, check buyer's ETH balance
        const buyerBalance = await web3.eth.getBalance(account.address);
        debugMessage("Buyer ETH balance: " + web3.utils.fromWei(buyerBalance, "ether") + " ETH");
        
        // Get contract details
        const tokenContract = new web3.eth.Contract(ticketTokenABI, ticketTokenAddress);
        debugMessage("Connected to contract at: " + ticketTokenAddress);
        
        // Check contract ticket supply
        const contractSupply = await tokenContract.methods.balanceOf(ticketTokenAddress).call();
        debugMessage("Contract available tickets: " + contractSupply);
        
        // Get the ticket price from the contract
        const pricePerTicketWei = await tokenContract.methods.ticketPrice().call();
        debugMessage("Ticket price: " + web3.utils.fromWei(pricePerTicketWei, "ether") + " ETH per ticket");
        
        const totalCostWei = BigInt(pricePerTicketWei) * BigInt(numTickets);
        const totalCostEth = web3.utils.fromWei(totalCostWei.toString(), "ether");
        
        // Check if buyer has enough funds
        if (BigInt(buyerBalance) < totalCostWei) {
          showError(`Insufficient ETH balance. Need ${totalCostEth} ETH but have ${web3.utils.fromWei(buyerBalance, "ether")} ETH`);
          return;
        }
        
        // Check if contract has enough tickets
        if (parseInt(contractSupply) < parseInt(numTickets)) {
          showError(`Not enough tickets available. Requested ${numTickets} but only ${contractSupply} available.`);
          return;
        }
        
        debugMessage(`Calculated total cost: ${totalCostEth} ETH for ${numTickets} tickets.`);
        
        // Call buyTicket function with the number of tickets
        const buyTxData = tokenContract.methods.buyTicket(numTickets).encodeABI();
        
        const buyTx = {
          from: account.address,
          to: ticketTokenAddress,
          gas: 300000,
          value: totalCostWei.toString(),
          data: buyTxData
        };
        
        $("#buyTxRequest").val(JSON.stringify(buyTx, null, 2));
        debugMessage("Buy transaction created: " + JSON.stringify(buyTx));
        
        const signedBuyTx = await web3.eth.accounts.signTransaction(buyTx, privateKey);
        debugMessage("Buy transaction signed");
        
        debugMessage("Sending buy transaction...");
        let receipt;
        try {
            receipt = await web3.eth.sendSignedTransaction(signedBuyTx.rawTransaction);
            debugMessage(`Ticket(s) purchased! Transaction hash: ${receipt.transactionHash}`);
            $("#buyTxReceipt").val(JSON.stringify(receipt, null, 2));
        } catch (txError) {
            // If we get an error but it contains a transaction hash, the tx might have succeeded
            if (txError.message.includes("Failed to check") || txError.message.includes("receipt")) {
                debugMessage("Receipt error, but transaction may have succeeded. Checking balances...");
                
                // Wait briefly to allow blockchain to update
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Check if the buyer's balance increased
                const newTicketBalance = await tokenContract.methods.balanceOf(account.address).call();
                debugMessage(`Current ticket balance: ${newTicketBalance}`);
                
                // Construct a minimal receipt
                const minimialReceipt = {
                    status: true,
                    transactionHash: "Unknown (provider error)",
                    message: "Transaction likely succeeded, but receipt was not available"
                };
                
                $("#buyTxReceipt").val(JSON.stringify(minimialReceipt, null, 2));
                debugMessage("Transaction probably completed successfully, but receipt details are unavailable");
            } else {
                // Re-throw if it's a different error
                throw txError;
            }
        }
        
        debugMessage("--- TICKET PURCHASE COMPLETE ---");
        
      } catch (error) {
        debugMessage("ERROR: " + error.message);
        if (error.receipt) {
          debugMessage("ERROR RECEIPT: " + JSON.stringify(error.receipt, null, 2));
        }
        
        // Enhanced error handling
        if (error.message.includes("insufficient funds")) {
          showError("Insufficient ETH for transaction (including gas fees)");
        } else if (error.message.includes("gas required exceeds")) {
          showError("Transaction requires more gas than provided");
        } else if (error.message.includes("nonce too low")) {
          showError("Transaction nonce issue - try refreshing the page");
        } else {
          console.error("Full error:", error);
          // Try to parse revert reason
          let reason = error.message;
          try {
            if (error.message.includes("{")) {
              const errorData = JSON.parse(error.message.substring(error.message.indexOf('{')));
              if (errorData.data && errorData.data.message) {
                reason = errorData.data.message;
              } else if (errorData.message) {
                reason = errorData.message;
              }
            }
          } catch (parseError) { /* Ignore if parsing fails */ }
          showError("Transaction failed: " + reason);
        }
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
  
    // Transfer Ticket functionality – update with the same error handling
    $("#transferTicketBtn").click(async function(){ 
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
      
      // Clear previous doorman verification
      $("#doormanVerification").removeClass("d-none");
      $("#doormanStatus").removeClass("alert-success alert-danger").text("Doorman is checking your tickets...");
      
      debugMessage(`--- STARTING TICKET TRANSFER PROCESS for ${transferAmount} tickets ---`);
      
      try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const tokenContract = new web3.eth.Contract(ticketTokenABI, ticketTokenAddress);
        
        // DOORMAN VERIFICATION STEP 1: Check if attendee has enough tickets
        const initialBalance = await tokenContract.methods.balanceOf(account.address).call();
        const initialVendorBalance = await tokenContract.methods.balanceOf(vendorAddress).call();
        
        debugMessage(`Doorman checking initial ticket balance: ${initialBalance}`);
        
        if (parseInt(initialBalance) < parseInt(transferAmount)) {
          // Doorman rejects - not enough tickets
          $("#doormanStatus").addClass("alert-danger")
            .html(`<strong>REJECTED!</strong> Doorman has denied entry. You only have ${initialBalance} tickets but are trying to use ${transferAmount}.`);
          debugMessage("Doorman REJECTED transfer: Insufficient tickets");
          return;
        }
        
        // Doorman approves initial check
        $("#doormanStatus").addClass("alert-warning")
          .html(`<strong>CHECKING...</strong> Doorman verified you have ${initialBalance} tickets. Processing transfer...`);
        debugMessage("Doorman confirmed attendee has sufficient tickets. Processing transfer...");
        
        // Call transfer() on the contract as before
        const data = tokenContract.methods.transfer(vendorAddress, transferAmount).encodeABI();
        const tx = {
          from: account.address,
          to: ticketTokenAddress,
          gas: 200000,
          data: data
        };
        
        $("#transferTxRequest").val(JSON.stringify(tx, null, 2));
        debugMessage("Initiating ticket transfer of " + transferAmount + " tokens to vendor.");
        
        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        debugMessage("Transfer transaction signed.");
        
        debugMessage("Sending transfer transaction...");
        try {
          const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
          $("#transferTxReceipt").val(JSON.stringify(receipt, null, 2));
          debugMessage("Ticket transfer successful. Receipt received.");
          
          // DOORMAN VERIFICATION STEP 2: Verify the transfer was successful
          // Wait briefly for blockchain to update
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check balances after transfer
          const finalBalance = await tokenContract.methods.balanceOf(account.address).call();
          const finalVendorBalance = await tokenContract.methods.balanceOf(vendorAddress).call();
          
          debugMessage(`Doorman checking final balances - Attendee: ${finalBalance}, Vendor: ${finalVendorBalance}`);
          
          // Calculate expected balances
          const expectedAttendeeBalance = BigInt(initialBalance) - BigInt(transferAmount);
          const expectedVendorBalance = BigInt(initialVendorBalance) + BigInt(transferAmount);
          
          // Check if the transfer was correct
          if (BigInt(finalBalance) === expectedAttendeeBalance && 
              BigInt(finalVendorBalance) === expectedVendorBalance) {
            // Doorman accepts
            $("#doormanStatus").removeClass("alert-warning").addClass("alert-success")
              .html(`<strong>ACCEPTED!</strong> Doorman has verified your tickets and granted entry. Enjoy the event!`);
            debugMessage("Doorman ACCEPTED: Ticket transfer verified and complete");
          } else {
            // Doorman suspects something's wrong
            $("#doormanStatus").removeClass("alert-warning").addClass("alert-danger")
              .html(`<strong>REJECTED!</strong> Doorman couldn't verify your ticket transfer. Please try again.`);
            debugMessage("Doorman REJECTED: Balance verification failed");
          }
          
        } catch (txError) {
          if (txError.message.includes("Failed to check") || txError.message.includes("receipt")) {
            debugMessage("Receipt error, but transaction may have succeeded. Checking balances...");
            
            // Wait longer for blockchain to update
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if the transfer happened by checking balances
            const finalBalance = await tokenContract.methods.balanceOf(account.address).call();
            const finalVendorBalance = await tokenContract.methods.balanceOf(vendorAddress).call();
            
            // Check if the balances changed correctly
            if (parseInt(finalBalance) === parseInt(initialBalance) - parseInt(transferAmount) &&
                parseInt(finalVendorBalance) === parseInt(initialVendorBalance) + parseInt(transferAmount)) {
              
              // The transfer was successful despite the receipt error
              const minimialReceipt = {
                status: true,
                transactionHash: "Unknown (provider error)",
                message: "Transfer likely succeeded, but receipt was not available"
              };
              
              $("#transferTxReceipt").val(JSON.stringify(minimialReceipt, null, 2));
              debugMessage("Transfer probably completed successfully, but receipt details are unavailable");
              
              // Doorman accepts
              $("#doormanStatus").removeClass("alert-warning").addClass("alert-success")
                .html(`<strong>ACCEPTED!</strong> Doorman has verified your tickets and granted entry. Enjoy the event!`);
              debugMessage("Doorman ACCEPTED: Ticket transfer verified despite receipt error");
            } else {
              // The transfer failed or was incomplete
              $("#doormanStatus").removeClass("alert-warning").addClass("alert-danger")
                .html(`<strong>REJECTED!</strong> Doorman couldn't verify your ticket transfer. Please try again.`);
              debugMessage("Doorman REJECTED: Balance verification failed after receipt error");
              throw new Error("Transfer verification failed: Balances did not update correctly");
            }
          } else {
            // Other transaction error
            $("#doormanStatus").removeClass("alert-warning").addClass("alert-danger")
              .html(`<strong>REJECTED!</strong> Transaction failed: ${txError.message}`);
            throw txError;
          }
        }
        
        debugMessage("--- TICKET TRANSFER COMPLETE ---");
        
      } catch (error) {
        debugMessage("ERROR: " + error.message);
        if (error.receipt) {
          debugMessage("ERROR RECEIPT: " + JSON.stringify(error.receipt, null, 2));
        }
        console.error("Full error:", error);
        let reason = error.message;
        try {
          if (error.message.includes("{")) {
            const errorData = JSON.parse(error.message.substring(error.message.indexOf('{')));
            if (errorData.data && errorData.data.message) {
              reason = errorData.data.message;
            } else if (errorData.message) {
              reason = errorData.message;
            }
          }
        } catch (parseError) { /* Ignore if parsing fails */ }
        showError("Transaction failed: " + reason);
        
        // Update doorman status for error
        $("#doormanStatus").removeClass("alert-warning").addClass("alert-danger")
          .html(`<strong>REJECTED!</strong> Doorman couldn't process your request due to an error: ${reason}`);
      }
    });
  
    // Add this event handler for the debug button
    $("#debugContractBtn").click(async function() {
      try {
        debugMessage("--- DEBUG CONTRACT STATUS ---");
        const tokenContract = new web3.eth.Contract(ticketTokenABI, ticketTokenAddress);
        
        // Contract details
        const name = await tokenContract.methods.name().call();
        const symbol = await tokenContract.methods.symbol().call();
        const decimals = await tokenContract.methods.decimals().call();
        const decimalsBN = parseInt(decimals); // Convert to number
        const ticketPrice = await tokenContract.methods.ticketPrice().call();
        const totalSupply = await tokenContract.methods.totalSupply().call();
        
        debugMessage(`Contract: ${name} (${symbol}), Decimals: ${decimalsBN}`);
        debugMessage(`Ticket Price: ${web3.utils.fromWei(ticketPrice, "ether")} ETH`);
        debugMessage(`Total Supply: ${totalSupply}`);
        
        // Contract token balance
        const contractBalance = await tokenContract.methods.balanceOf(ticketTokenAddress).call();
        // Use a proper divisor based on decimals
        const divisor = 10 ** decimalsBN;
        const readableBalance = Math.floor(Number(contractBalance) / divisor);
        debugMessage(`Contract token balance: ${contractBalance} (${readableBalance} tickets)`);
        
        // Vendor details
        const vendorAddr = await tokenContract.methods.vendor().call();
        debugMessage(`Vendor address: ${vendorAddr}`);
        
        // If a wallet is loaded, check its status
        const buyerAddress = $("#buyWalletAddress").val();
        if (buyerAddress) {
          const ethBalance = await web3.eth.getBalance(buyerAddress);
          const tokenBalance = await tokenContract.methods.balanceOf(buyerAddress).call();
          const readableTokens = Math.floor(Number(tokenBalance) / divisor);
          debugMessage(`Buyer at ${buyerAddress}:`);
          debugMessage(`- ETH Balance: ${web3.utils.fromWei(ethBalance, "ether")} ETH`);
          debugMessage(`- Token Balance: ${tokenBalance} (${readableTokens} tickets)`);
        }
        
        debugMessage("--- END DEBUG ---");
      } catch (error) {
        debugMessage("Debug error: " + error.message);
      }
    });
  
    function showError(message) {
      $("#errorMessage").text(message);
      $("#errorModal").show();
      debugMessage("Error: " + message);
    }
});
