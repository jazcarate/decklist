import { useEffect } from "react"
import { cyan } from '@ant-design/colors';
import { Layout } from "antd";
import { Content, Footer } from "antd/es/layout/layout";

import { useAppDispatch } from "./app/hooks";
import { loginAsync } from "./features/login/loginSlice"
import Title from "antd/es/typography/Title";

import styles from './App.module.css';

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
      <Content>main content</Content>
      <Footer>footer</Footer>
    </Layout>
  )
}

export default App
