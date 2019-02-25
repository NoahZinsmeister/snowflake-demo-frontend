import { providers, Wallet } from 'ethers'

const provider = new providers.JsonRpcProvider(process.env.REACT_APP_INFURA_URL)
const wallet = new Wallet(process.env.REACT_APP_PRIVATE_KEY, provider)

export async function handler (event) {
  try {
    const { to, transactionData } = JSON.parse(event.body)
    const nonce = await provider.getTransactionCount(wallet.address, 'latest')

    const transaction = await wallet.sendTransaction({ to, data: transactionData, nonce })

    return {
      statusCode: 200,
      body: JSON.stringify({ transactionHash: transaction.hash })
    }
  } catch (error) {
    console.log(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.toString() })
    }
  }
}
