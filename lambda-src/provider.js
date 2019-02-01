import { providers, Wallet } from 'ethers'

const provider = new providers.JsonRpcProvider(process.env.REACT_APP_INFURA_URL)
const wallet = new Wallet(process.env.REACT_APP_PRIVATE_KEY, provider)

export async function handler (event, context) {
  try {
    const { to, transactionData } = JSON.parse(event.body)
    const transaction = await wallet.sendTransaction({ to, data: transactionData })

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
