import { Link, useParams } from 'react-router-dom'                        
                                                                              
export function SharePlaceholderPage() {                                  
    const { shareId } = useParams()                                         
                                                                            
    return (                                                                
    <main className="page stack">                                         
        <p className="eyebrow">Rahasia</p>                                  
        <h1>Share page coming next</h1>                                     
        <p className="hint">                                                
        This route exists so the generated link is meaningful. The actual 
        retrieval UI will be built in the next step.                      
        </p>                                                                
        <div className="card stack">                                        
        <p>                                                               
            Requested share ID: <code>{shareId}</code>                      
        </p>                                                              
        <Link to="/">Back to create page</Link>                           
        </div>                                                              
    </main>                                                               
    )                                                                       
}