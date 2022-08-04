const Web3 = require('web3');
const Unin = require('./Unin.json');

class Web3Client {
    constructor(provider) {
        this.provider = provider;
        this.web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));
    }
    
    verifySignature(message, signature) {
        const signedAddress = this.web3.eth.accounts.recover(message, signature);
        return signedAddress.toLowerCase();
    }

    getContract() {
        return (this.contract)
            ? this.contract
            : new this.web3.eth.Contract(Unin.abi, process.env.CONTRACT);
    }

    getItemOwner(itemId) {
        return this.getContract().methods.ownerOf(itemId).call();
    }

    getItemUri(itemId) {
        return this.getContract().methods.tokenURI(itemId).call();
    }
}

module.exports.Web3Client = Web3Client;
