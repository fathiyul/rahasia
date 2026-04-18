type ShareResultProps = {                                                 
    shareId: string                                                         
}                                                                         
                                                                            
export function ShareResult({ shareId }: ShareResultProps) {              
    const shareUrl = `${window.location.origin}/shares/${shareId}`          
                                                                            
    return (                                                                
    <section className="card stack">                                      
        <h2>Share created</h2>                                              
        <div className="field">                                             
        <label>Share ID</label>                                           
        <input value={shareId} readOnly />                                
        </div>                                                              
        <div className="field">                                             
        <label>Share URL</label>                                          
        <input value={shareUrl} readOnly />                               
        </div>                                                              
        <p className="hint">                                                
        The retrieval page will be implemented in the next step.          
        </p>                                                                
    </section>                                                            
    )                                                                       
} 