import {createClient} from '@supabase/supabase-js';
import {cloudConfig} from './cloud-config.js';

export class SaveQueue {
  constructor(write,onStatus=()=>{}){this.write=write;this.onStatus=onStatus;this.revision=0;this.pending=null;this.running=false;this.blocked=false;this.timer=null;this.done=Promise.resolve();}
  reset(revision=0){clearTimeout(this.timer);this.revision=revision;this.pending=null;this.blocked=false;}
  enqueue(data){this.pending=structuredClone(data);if(!this.blocked)this.onStatus('pending');clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),650);}
  async flush(){clearTimeout(this.timer);if(this.running){await this.done;if(this.pending&&!this.blocked)return this.flush();return;}if(this.blocked||!this.pending)return;
    this.running=true;
    this.done=(async()=>{while(this.pending&&!this.blocked){const data=this.pending;this.pending=null;this.onStatus('saving');try{this.revision=await this.write(data,this.revision);this.onStatus('saved');}catch(error){if(!this.pending)this.pending=data;this.blocked=true;this.onStatus(error.message?.includes('REVISION_CONFLICT')?'conflict':'error',error);}}})();
    try{await this.done;}finally{this.running=false;}
  }
  async retry(){this.blocked=false;return this.flush();}
}

const validUrl=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/;
export const cloud={configured:!!(cloudConfig.url&&cloudConfig.publishableKey),user:null,client:null,queue:null,status:'local',onChange:()=>{},recovery:false,
  async start(onChange){
    this.onChange=onChange;
    if(!this.configured)return;
    if(!validUrl.test(cloudConfig.url)||cloudConfig.publishableKey.startsWith('sb_secret_'))throw Error('Некорректные публичные настройки Supabase');
    this.client=createClient(cloudConfig.url,cloudConfig.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await this.client.auth.getSession();if(error)throw error;this.user=data.session?.user||null;
    this.client.auth.onAuthStateChange((event,session)=>{
      const changed=this.user?.id!==session?.user?.id;this.user=session?.user||null;
      if(event==='PASSWORD_RECOVERY'){this.recovery=true;setTimeout(()=>this.onChange('recovery'),0);}
      else if(changed)setTimeout(()=>this.onChange('auth'),0);
    });
    this.queue=new SaveQueue(async(payload,expected)=>{
      if(!this.user)throw Error('Войдите в аккаунт');
      const {data,error}=await this.client.rpc('save_player_book',{payload,expected_revision:expected});
      if(error)throw error;return Number(data);
    },(status,error)=>{this.status=status;this.onChange('status',error);});
  },
  async load(){
    if(!this.user)return null;
    const {data,error}=await this.client.from('player_books').select('data,revision').eq('user_id',this.user.id).maybeSingle();
    if(error)throw error;this.queue.reset(Number(data?.revision||0));this.status='saved';return data?.data||null;
  },
  async signIn(email,password){const {error}=await this.client.auth.signInWithPassword({email,password});if(error)throw error;},
  async signUp(email,password){const {data,error}=await this.client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;return !!data.session;},
  async resetPassword(email){const {error}=await this.client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;},
  async updatePassword(password){const {error}=await this.client.auth.updateUser({password});if(error)throw error;this.recovery=false;},
  async signOut(){await this.queue.flush();if(this.queue.pending)throw Error('Есть несохранённые изменения. Скачайте копию или повторите сохранение перед выходом.');const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw error;},
  enqueue(data){if(this.user&&this.queue)this.queue.enqueue(data);}
};
