import { useState } from 'react'                                          
                                                                              
import { ShareForm } from '../components/ShareForm'                       
import { ShareResult } from '../components/ShareResult'                   
import { createShare } from '../lib/api/shares'                           
import type { CreateSharePayload } from '../types/share'                  
                                                                            
export function CreateSharePage() {                                       
    const [isSubmitting, setIsSubmitting] = useState(false)                 
    const [error, setError] = useState<string | null>(null)                 
    const [createdShareId, setCreatedShareId] = useState<string |           
null>(null)                                                                 
                                                                            
    async function handleCreateShare(payload: CreateSharePayload) {         
    setIsSubmitting(true)                                                 
    setError(null)                                                        
                                                                            
    try {                                                                 
        const response = await createShare(payload)                         
        setCreatedShareId(response.id)                                      
    } catch (err) {                                                       
        setError(err instanceof Error ? err.message : 'Failed to create share')                                                                     
    } finally {                                                           
        setIsSubmitting(false)                                              
    }                                                                     
    }                                                                       
                                                                            
    return (                                                                
    <main className="page stack">                                         
        <header className="stack">                                          
        <p className="eyebrow">Rahasia</p>                                
        <h1>Create a share</h1>                                           
        <p className="hint">                                              
            This step wires the frontend flow to the backend. Real browser-side encryption comes later.                                         
        </p>                                                              
        </header>                                                           
                                                                            
        {error ? <p className="error">{error}</p> : null}                   
                                                                            
        <ShareForm isSubmitting={isSubmitting} onSubmit={handleCreateShare} 
/>                                                                          
                                                                            
        {createdShareId ? <ShareResult shareId={createdShareId} /> : null}  
    </main>                                                               
    )                                                                       
}