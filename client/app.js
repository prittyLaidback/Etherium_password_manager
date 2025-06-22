// Configuration
const CONTRACT_ADDRESS = "0xc48A8Fc25A82ba32a4C6D359d2Cf0b8c4a3D2fd7"; // Replace with your deployed address
const CONTRACT_ABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "user",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "website",
                "type": "string"
            }
        ],
        "name": "PasswordStored",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_website",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_username",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_encryptedPassword",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_iv",
                "type": "string"
            }
        ],
        "name": "storePassword",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getPasswordCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "index",
                "type": "uint256"
            }
        ],
        "name": "getPasswordEntry",
        "outputs": [
            {
                "internalType": "string",
                "name": "website",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "username",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "encryptedPassword",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "iv",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// Global variables
let web3;
let contract;
let accounts = [];

// Initialize application
window.addEventListener('load', async () => {
    // Connect to Ethereum wallet
    document.getElementById('connect-wallet').addEventListener('click', connectWallet);
    
    // Save password handler
    document.getElementById('save-password').addEventListener('click', savePassword);
});

// ================== Core Functions ================== //

async function connectWallet() {
    const networkValid = await checkNetwork();
    if (!networkValid) {
        alert("Please connect to Ganache network (Chain ID: 1337)");
        return;
    }

    const connected = await initContract();
    if (connected) {
        document.getElementById('wallet-address').textContent = 
            `Connected: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
        document.getElementById('password-form').style.display = 'block';
        await loadPasswords();
    }
}

async function initContract() {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        try {
            accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
            return true;
        } catch (error) {
            console.error("User denied account access", error);
            return false;
        }
    } else {
        alert("Please install MetaMask!");
        return false;
    }
}

async function checkNetwork() {
    const ganacheChainId = '0x539'; // 1337 in hex
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== ganacheChainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: ganacheChainId }],
                });
                return true;
            } catch (switchError) {
                if (switchError.code === 4902) {
                    return await addGanacheNetwork();
                }
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error("Network check failed:", error);
        return false;
    }
}

async function addGanacheNetwork() {
    try {
        await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: '0x539',
                chainName: 'Ganache',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['http://127.0.0.1:7545'],
            }],
        });
        return true;
    } catch (error) {
        console.error("Failed to add Ganache network:", error);
        return false;
    }
}

// ================== Password Functions ================== //

function encryptPassword(masterPassword, password) {
    const iv = CryptoJS.lib.WordArray.random(16).toString();
    const encrypted = CryptoJS.AES.encrypt(
        password, 
        masterPassword, 
        { iv: CryptoJS.enc.Hex.parse(iv) }
    ).toString();
    
    return {
        encrypted,
        iv
    };
}

function decryptPassword(masterPassword, encryptedData, iv) {
    try {
        const decrypted = CryptoJS.AES.decrypt(
            encryptedData,
            masterPassword,
            { iv: CryptoJS.enc.Hex.parse(iv) }
        );
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error("Decryption failed:", e);
        return "Decryption failed - wrong master password?";
    }
}

async function savePassword() {
    const website = document.getElementById('website').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const masterPassword = document.getElementById('master-password').value;
    
    if (!website || !username || !password || !masterPassword) {
        alert("Please fill all fields");
        return;
    }
    
    // Encrypt the password
    const { encrypted, iv } = encryptPassword(masterPassword, password);
    
    // Store on blockchain
    try {
        const receipt = await contract.methods.storePassword(
            website,
            username,
            encrypted,
            iv
        ).send({ 
            from: accounts[0],
            gas: 300000  // Adequate gas limit for Ganache
        });
        
        console.log("Transaction receipt:", receipt);
        alert("Password saved successfully!");
        await loadPasswords();
        
        // Clear form
        document.getElementById('website').value = '';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('master-password').value = '';
    } catch (error) {
        console.error("Error saving password:", error);
        alert(`Error: ${error.message}`);
    }
}

async function loadPasswords() {
    const container = document.getElementById('passwords-container');
    container.innerHTML = '<p>Loading passwords...</p>';
    
    try {
        const count = await contract.methods.getPasswordCount().call({ from: accounts[0] });
        
        if (count === 0) {
            container.innerHTML = '<p>No passwords saved yet.</p>';
            return;
        }

        container.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const entry = await contract.methods.getPasswordEntry(i).call({ from: accounts[0] });
            
            const entryElement = document.createElement('div');
            entryElement.className = 'password-entry';
            entryElement.innerHTML = `
                <h3>${entry.website}</h3>
                <p>Username: ${entry.username}</p>
                <p>Password: <span class="encrypted-password" data-encrypted="${entry.encryptedPassword}" data-iv="${entry.iv}">
                    [Encrypted - click to reveal]
                </span></p>
                <button class="reveal-password">Reveal Password</button>
                <button class="copy-username" data-username="${entry.username}">Copy Username</button>
            `;
            
            container.appendChild(entryElement);
        }
        
        // Add event listeners
        document.querySelectorAll('.reveal-password').forEach(button => {
            button.addEventListener('click', async (e) => {
                const masterPassword = prompt("Enter your master password to reveal this password");
                if (masterPassword) {
                    const encryptedSpan = e.target.parentElement.querySelector('.encrypted-password');
                    const encrypted = encryptedSpan.getAttribute('data-encrypted');
                    const iv = encryptedSpan.getAttribute('data-iv');
                    
                    const decrypted = decryptPassword(masterPassword, encrypted, iv);
                    encryptedSpan.textContent = decrypted;
                }
            });
        });

        document.querySelectorAll('.copy-username').forEach(button => {
            button.addEventListener('click', (e) => {
                const username = e.target.getAttribute('data-username');
                navigator.clipboard.writeText(username);
                e.target.textContent = 'Copied!';
                setTimeout(() => {
                    e.target.textContent = 'Copy Username';
                }, 2000);
            });
        });

    } catch (error) {
        console.error("Error loading passwords:", error);
        container.innerHTML = `<p class="error">Error loading passwords: ${error.message}</p>`;
    }
}