import { createBrowserRouter } from 'react-router-dom'                    
                                                                              
import { CreateSharePage } from '../pages/CreateSharePage'                
import { SharePlaceholderPage } from '../pages/SharePlaceholderPage'      
                                                                            
export const router = createBrowserRouter([                               
    {                                                                       
    path: '/',                                                            
    element: <CreateSharePage />,                                         
    },                                                                      
    {                                                                       
    path: '/shares/:shareId',                                             
    element: <SharePlaceholderPage />,                                    
    },                                                                      
])