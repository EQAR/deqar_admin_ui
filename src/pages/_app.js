import "@/styles/globals.css";
import "antd/dist/reset.css";
import "suneditor/dist/css/suneditor.min.css";
import "filepond/dist/filepond.min.css";
import { App as AntdApp, ConfigProvider } from "antd";
import { SWRConfig } from "swr";
import { swrDefaults } from "@/lib/swr";

import theme from '@/theme/themeConfig.js';
import {SessionProvider} from "next-auth/react";
import AppLayout from "@/components/AppLayout/AppLayout";

export default function App({ Component, pageProps }) {
  const content = Component.withoutLayout
      ? <Component {...pageProps} />
      : <AppLayout><Component {...pageProps} /></AppLayout>;

  return (
      <ConfigProvider theme={theme}>
          <AntdApp>
              <SessionProvider session={pageProps.session}>
                  <SWRConfig value={swrDefaults}>
                      {content}
                  </SWRConfig>
              </SessionProvider>
          </AntdApp>
      </ConfigProvider>
  )
}
