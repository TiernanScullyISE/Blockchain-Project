// Return ticket functionality

document.addEventListener('DOMContentLoaded', () => {
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const walletStatus = document.getElementById('walletStatus');
    const returnForm = document.getElementById('returnForm');
    const userTickets = document.getElementById('userTickets');
    const refundPerTicket = document.getElementById('refundPerTicket');
    const returnAmount = document.getElementById('returnAmount');
    const totalRefund = document.getElementById('totalRefund');
    const returnTicketsBtn = document.getElementById('returnTicketsBtn');
    const returnResult = document.getElementById('returnResult');
    const txHash = document.getElementById('txHash');
    const ticketsReturned = document.getElementById('ticketsReturned');
    const refundAmount = document.getElementById('refundAmount');
    const newTicketBalance = document.getElementById('newTicketBalance');
    
    let web3;
    let contract;
    let currentAccount;
    let ticketPriceWei;
    
    // Initialize Web3 and contract
    async function init() {
        try {
            web3 = await initWeb3();
            const networkOK = await checkNetwork();
            if (!networkOK) {
                throw new Error("Please connect to Sepolia Test Network");
            }
            contract = initContract(web3);
            
            // Get current account
            const accounts = await web3.eth.getAccounts();
            if (accounts.length === 0) {
                throw new Error("No accounts found. Please unlock MetaMask.");
            }
            currentAccount = accounts[0];
            
            return true;
        } catch (error) {
            console.error("Initialization error:", error);
            walletStatus.textContent = `Error: ${error.message}`;
            return false;
        }
    }
    
    // Connect wallet and load ticket details
    connectWalletBtn.addEventListener('click', async () => {
        try {
            const initialized = await init();
            if (!initialized) return;
            
            walletStatus.textContent = `Connected: ${currentAccount}`;
            
            // Load contract and user details
            ticketPriceWei = await contract.methods.ticketPrice().call();
            const userTicketBalance = await contract.methods.balanceOf(currentAccount).call();
            
            // Update UI
            userTickets.textContent = userTicketBalance;
            refundPerTicket.textContent = formatEth(ticketPriceWei);
            updateTotalRefund();
            
            returnForm.classList.remove('hidden');
            
        } catch (error) {
            console.error("Connection error:", error);
            walletStatus.textContent = `Error: ${error.message}`;
        }
    });
    
    // Update total refund when return amount changes
    returnAmount.addEventListener('input', updateTotalRefund);
    
    function updateTotalRefund() {
        if (!ticketPriceWei) return;
        
        const amount = parseInt(returnAmount.value) || 0;
        const refund = amount * web3.utils.fromWei(ticketPriceWei, 'ether');
        totalRefund.textContent = refund.toFixed(6);
    }
    
    // Return tickets
    returnTicketsBtn.addEventListener('click', async () => {
        try {
            if (!web3 || !contract || !currentAccount) {
                throw new Error("Wallet not connected. Please connect your wallet first.");
            }
            
            const amount = parseInt(returnAmount.value);
            if (isNaN(amount) || amount <= 0) {
                throw new Error("Please enter a valid ticket amount.");
            }
            
            const userTicketBalance = await contract.methods.balanceOf(currentAccount).call();
            if (parseInt(userTicketBalance) < amount) {
                throw new Error("You don't have enough tickets to return.");
            }
            
            // Execute return transaction
            returnTicketsBtn.disabled = true;
            returnTicketsBtn.textContent = "Processing...";
            
            const result = await contract.methods.returnTicket(amount).send({
                from: currentAccount
            });
            
            // Calculate refund amount
            const refundWei = BigInt(ticketPriceWei) * BigInt(amount);
            
            // Update UI with transaction result
            txHash.textContent = result.transactionHash;
            ticketsReturned.textContent = amount;
            refundAmount.textContent = formatEth(refundWei.toString());
            
            // Get updated token balance
            const updatedBalance = await contract.methods.balanceOf(currentAccount).call();
            newTicketBalance.textContent = updatedBalance;
            
            // Show result
            returnForm.classList.add('hidden');
            returnResult.classList.remove('hidden');
            
        } catch (error) {
            console.error("Return error:", error);
            alert(`Return failed: ${error.message}`);
            returnTicketsBtn.disabled = false;
            returnTicketsBtn.textContent = "Return Tickets";
        }
    });
}); 