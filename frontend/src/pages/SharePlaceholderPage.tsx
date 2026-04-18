import { Link, useParams } from 'react-router-dom'                        
import { useEffect, useState } from 'react'                               
                                                                            
import { getShare } from '../lib/api/shares'                              
import type { GetShareResponse } from '../types/share'                    
                                                                            
export function SharePlaceholderPage() {                                  
    const { shareId } = useParams()                                         
    const [share, setShare] = useState<GetShareResponse | null>(null)       
    const [error, setError] = useState<string | null>(null)                 
    const [isLoading, setIsLoading] = useState(false)                       
    const missingShareId = !shareId
                                                                            
    useEffect(() => {                                                       
    if (!shareId) {                                                       
        return                                                              
    }                                                                     

    const currentShareId = shareId
                                                                            
    let isCancelled = false                                               
                                                                            
    async function loadShare() {                                          
        setIsLoading(true)                                                  
      setError(null)                                                      
                                                                            
      try {                                                               
        const response = await getShare(currentShareId)                   
        if (!isCancelled) {                                               
            setShare(response)                                              
        }                                                                 
        } catch (err) {                                                     
        if (!isCancelled) {                                               
            setError(err instanceof Error ? err.message : 'Failed to load share')                                                                     
        }                                                                 
        } finally {                                                         
        if (!isCancelled) {                                               
            setIsLoading(false)                                             
        }                                                                 
        }                                                                   
    }                                                                     
                                                                            
    void loadShare()                                                      
                                                                            
    return () => {                                                        
        isCancelled = true                                                  
    }                                                                     
    }, [shareId])                                                           
                                                                            
    return (                                                                
    <main className="page stack">                                         
        <p className="eyebrow">Rahasia</p>                                  
        <h1>View share</h1>                                                 
                                                                            
        {isLoading ? <p className="hint">Loading share...</p> : null}       
                                                                            
        {missingShareId || error ? (                                        
        <section className="card stack">                                  
            <p className="error">{missingShareId ? 'Missing share ID' : error}</p>
            <Link to="/">Back to create page</Link>                         
        </section>                                                        
        ) : null}                                                           
                                                                            
        {share ? (                                                          
        <section className="card stack">                                  
            <div className="field">                                         
            <label>Share ID</label>                                       
            <input value={share.id} readOnly />                           
            </div>                                                          
                                                                            
            <div className="field">                                         
            <label>Share type</label>                                     
            <input value={share.type} readOnly />                         
            </div>                                                          
                                                                            
            <div className="field">                                         
            <label>Payload</label>                                        
            <textarea value={share.encrypted_payload} rows={10} readOnly  
/>                                                                          
            </div>                                                          
                                                                            
            <div className="field">                                         
            <label>Expires at</label>                                     
            <input value={share.expires_at} readOnly />                   
            </div>                                                          
                                                                            
            <div className="field">                                         
            <label>Burn after read</label>                                
            <input value={share.burn_after_read ? 'Yes' : 'No'} readOnly  
/>                                                                          
            </div>                                                          
                                                                            
            <p className="hint">                                            
            This is still the temporary pre-encryption retrieval flow. A later                                                                       
            step will replace direct payload display with client-side     
            decryption.                                                   
            </p>                                                            
                                                                            
            <Link to="/">Back to create page</Link>                         
        </section>                                                        
        ) : null}                                                           
    </main>                                                               
    )                                                                       
}
