import Document, { Html, Head, Main, NextScript } from "next/document";
import {createCache, extractStyle, StyleProvider} from "@ant-design/cssinjs";

const MyDocument = () => {
  return (
    <Html lang="en">
        <Head>
            <link rel="icon" href="/images/cropped-eqar-favicon-32x32.png" sizes="32x32"/>
            <link rel="icon" href="/images/cropped-eqar-favicon-192x192.png" sizes="192x192"/>
            <link rel="apple-touch-icon-precomposed" href="/images/cropped-eqar-favicon-180x180.png"/>
        </Head>
        <body>
        <Main/>
        <NextScript/>
        </body>
    </Html>
  );
}

MyDocument.getInitialProps = async (ctx) => {
    const cache = createCache();
    const originalRenderPage = ctx.renderPage;
    ctx.renderPage = () =>
        originalRenderPage({
            enhanceApp: (App) => (props) => (
                <StyleProvider cache={cache}>
                    <App {...props} />
                </StyleProvider>
            ),
        });

    const initialProps = await Document.getInitialProps(ctx);
    const style = extractStyle(cache, true);
    return {
        ...initialProps,
        styles: (
            <>
                {initialProps.styles}
                <style dangerouslySetInnerHTML={{ __html: style }} />
            </>
        ),
    };
};

export default MyDocument;
