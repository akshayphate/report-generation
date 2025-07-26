
// This file allows you to override the default App Component and customize the initialization of pages. 
import React, { ReactElement } from 'react';
import { AppProps } from 'next/app';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps): ReactElement {
  return <Component {...pageProps} />;
}


