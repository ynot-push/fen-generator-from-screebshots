import { useState } from 'react'

import './App.css'
import ScreenshotToFen from './ScreenshotToFen.jsx'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <ScreenshotToFen />
    </>
  )
}

export default App
