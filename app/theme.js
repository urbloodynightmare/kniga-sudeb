const key='book-of-fates-theme';
export function setTheme(theme){
 const value=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=value;
 document.querySelector('meta[name="theme-color"]')?.setAttribute('content',value==='dark'?'#10251b':'#f7f4eb');
 for(const button of document.querySelectorAll('[data-action="theme"]'))button.setAttribute('aria-pressed',String(button.dataset.theme===value));
 try{localStorage.setItem(key,value);}catch{}return value;
}
export function initTheme(){let theme='light';try{theme=localStorage.getItem(key)||'light';}catch{}setTheme(theme);window.addEventListener('storage',e=>{if(e.key===key)setTheme(e.newValue);});}
