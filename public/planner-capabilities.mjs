// Safe browser default; the server checks credentials and spending permission.
export const aiAvailability={ready:false,reason:'not_checked',message:'תכנון AI חופשי עדיין לא פעיל. כרגע אפשר לבחור ארוחה מוכנה לתכנון או להדביק מצרכים עם כמויות.'};
export function availabilityFromServer(data){return {...aiAvailability,ready:data?.mode==='anthropic-direct'&&data.ai_ready===true&&data.connection_verified===true,reason:String(data?.availability_reason||'unavailable')};}
