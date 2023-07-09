import { useEffect } from "react"
import { cyan } from '@ant-design/colors';
import { Layout } from "antd";

import { useAppDispatch } from "./app/hooks";
import { loginAsync } from "./features/login/loginSlice"
import Title from "antd/es/typography/Title";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import styles from './App.module.css';
import Home from "./pages/Home";
import Event from "./pages/Event";
import CreateEvent from "./pages/CreateEvent";

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loginAsync());
  }, []);

  return (
    <Layout className={styles.layout}>
      <Title style={{ color: cyan[6] }}>
        <span role="img" aria-label="logo">📖</span>
        Decklist.fun
      </Title>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/e" element={<CreateEvent />} />
          <Route path="/e/:id" element={<Event />} />
        </Routes>
      </Router>
    </Layout >
  )
}

export default App
