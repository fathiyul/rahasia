import { createBrowserRouter } from 'react-router-dom'

import { CreateSharePage } from '../pages/CreateSharePage'
import { ViewSharePage } from '../pages/ViewSharePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <CreateSharePage />,
  },
  {
    path: '/shares/:shareId',
    element: <ViewSharePage />,
  },
])
