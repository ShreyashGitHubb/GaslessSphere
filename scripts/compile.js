import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contractPath = path.resolve(__dirname, '../src/contracts/SpaceNFT.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'SpaceNFT.sol': {
      content: source
    }
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode']
      }
    }
  }
};

console.log('Compiling contract...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

let hasErrors = false;
if (output.errors) {
  output.errors.forEach(err => {
    if (err.severity === 'error') {
      console.error(err.formattedMessage);
      hasErrors = true;
    } else {
      console.warn(err.formattedMessage);
    }
  });
}

if (hasErrors) {
  process.exit(1);
}

const contract = output.contracts['SpaceNFT.sol']['SpaceNFT'];

const destDir = path.resolve(__dirname, '../src/constants');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.writeFileSync(
  path.resolve(destDir, 'SpaceNFT.json'),
  JSON.stringify({
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object
  }, null, 2)
);

console.log('Contract compiled successfully to src/constants/SpaceNFT.json!');
process.exit(0);
