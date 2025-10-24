import "@/styles/globals.css";
import {ConfigProvider} from "antd";

import theme from '@/theme/themeConfig.js';

export default function App({ Component, pageProps }) {
  return (
      <ConfigProvider theme={theme}>
        <Component {...pageProps} />
      </ConfigProvider>
  )
}
