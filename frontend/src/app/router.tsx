import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '../components/AppShell'
import { CreateSharePage } from '../pages/CreateSharePage'
import { ViewSharePage } from '../pages/ViewSharePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <CreateSharePage />,
      },
      {
        path: 'shares/:shareId',
        element: <ViewSharePage />,
      },
    ],
  },
])
