import { useEffect, useState } from 'react'
import { useWeb3Context } from 'web3-react'

function wrapPromise(promiseToWrap) {
  var cancelled = false

  const promise = new Promise((resolve, reject) => {
    promiseToWrap()
      .then(v => {
        if (!cancelled) {
          resolve(v)
        } else {
          reject({ wasCancelled: true })
        }
      })
  })

  function cancel() {
    cancelled = true
  }

  return { promise, cancel }
}

export default function TransactionController ({
  method, onClick = () => {}, onTransactionHash = () => {}, onReceipt = () => {}, onError = () => {}, onReset = () => {}, children
}) {
  const context = useWeb3Context()
  const [transactionState, setTransactionState] = useState('unsent')
  const [transactionHash, setTransactionHash] = useState()

  const [isMounted, setIsMounted] = useState(true)
  useEffect(() => () => setIsMounted(false), [])

  useEffect(() => {
    if (transactionHash) {
      const { promise, cancel } = wrapPromise(() => context.library.waitForTransaction(transactionHash))
      promise
        .then(() => {
          setTransactionState('receipt')
          onReceipt()
        })
        .catch(error => {
          if (!error.wasCancelled) {
            throw error
          }
        })
      return () => cancel()
    } else {
      return () => { }
    }
  }, [transactionHash])

  async function sendTransaction () {
    setTransactionState('waitingOnTransactionHash')
    onClick()
    
    const { to, transactionData } = await method()

    fetch('/.netlify/functions/provider', { method: 'POST', body: JSON.stringify({ to, transactionData }) })
      .then(async response => {
        const json = await response.json()
        if (response.status !== 200) throw Error(json.message)
        return json
      })
      .then(json => {
        const { transactionHash } = json
        setTransactionState('waitingOnConfirmation')
        setTransactionHash(transactionHash)
        onTransactionHash(transactionHash)
      })
      .catch(error => {
        setTransactionState('error')
        onError(error)
      })
  }

  function resetTransaction () {
    setTransactionHash(undefined)
    setTransactionState('unsent')
    onReset()
  }

  return isMounted && children(transactionState, { sendTransaction, resetTransaction })
}
