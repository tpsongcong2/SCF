/* Supabase server authentication rollout.
   Keep disabled until the Edge Function and RLS migration are deployed. */
const SCF_SERVER_AUTH_ENABLED=false;

async function serverUsernameLogin(username,password){
  if(!sb)throw new Error('Chưa kết nối được máy chủ xác thực.');
  const{data,error}=await sb.functions.invoke('scf-auth',{
    body:{action:'login',username:String(username||'').trim(),password:String(password||'')}
  });
  if(error)throw new Error(data?.error||error.message||'Không thể đăng nhập qua máy chủ.');
  if(!data?.access_token||!data?.refresh_token||!data?.employee)throw new Error(data?.error||'Máy chủ trả về phiên đăng nhập không hợp lệ.');
  const{error:sessionError}=await sb.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});
  if(sessionError)throw sessionError;
  return data.employee;
}

async function getServerAuthSession(){
  if(!SCF_SERVER_AUTH_ENABLED||!sb)return null;
  const{data,error}=await sb.auth.getSession();
  if(error)throw error;
  return data?.session||null;
}

async function serverLogout(){
  if(SCF_SERVER_AUTH_ENABLED&&sb)try{await sb.auth.signOut();}catch(e){console.warn('Server logout:',e.message);}
}
