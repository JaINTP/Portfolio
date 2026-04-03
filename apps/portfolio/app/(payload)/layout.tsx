import { RootLayout } from '@payloadcms/next/layouts'
import { ReactNode } from 'react'
import config from '../../payload.config'

import './custom.css'

type Props = {
  children: ReactNode
}

const Layout = ({ children }: Props) => (
  <RootLayout config={config}>
    {children}
  </RootLayout>
)

export default Layout
