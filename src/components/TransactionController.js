import { useEffect, useState } from 'react'
import { useWeb3Context } from 'web3-react';

export default function TransactionController ({
  method, onClick = () => {}, onTransactionHash = () => {}, onReceipt = () => {}, onError = () => {}, onReset = () => {}, children
}) {
  const context = useWeb3Context()
  const [transactionState, setTransactionState] = useState('unsent')
  const [transactionHash, setTransactionHash] = useState()

  useEffect(() => {
    if (transactionHash) {
      context.library.once(transactionHash, () => {
        onReceipt()
        setTransactionState('receipt')
      })
      return () => context.library.removeAllListeners(transactionHash)
    }
  }, [transactionHash])

  async function sendTransaction () {
    onClick()
    setTransactionState('waitingOnTransactionHash')
    
    const { to, transactionData } = await method()

    fetch('/.netlify/functions/provider', { method: 'POST', body: JSON.stringify({ to, transactionData }) })
      .then(async response => {
        const json = await response.json()
        if (response.status !== 200) throw Error(json.message)
        return json
      })
      .then(json => {
        const { transactionHash } = json
        onTransactionHash(transactionHash)
        setTransactionHash(transactionHash)
        setTransactionState('waitingOnConfirmation')
      })
      .catch(error => {
        onError(error)
        setTransactionState('error')        
      })
  }

  function resetTransaction () {
    onReset()
    setTransactionHash(undefined)
    setTransactionState('unsent')
  }

  return children(transactionState, { sendTransaction, resetTransaction })
}
