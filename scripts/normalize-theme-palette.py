from pathlib import Path
import re
# Semantic colors make the existing layout follow either palette without changing controls.
p=Path('app/style.css');s=p.read_text(encoding='utf-8');start=s.index(':root');preamble=s[:start];s=s[start:]
def split_selectors(s):
 out=[];depth=0;begin=0
 for i,c in enumerate(s):
  if c in '([':depth+=1
  elif c in ')]':depth-=1
  elif c==',' and depth==0:out.append(s[begin:i].strip());begin=i+1
 out.append(s[begin:].strip());return out
meta=('small','.hint','.muted','.eyebrow','.empty-text','.subclass','.card-race','.save-status','.breadcrumb','.slot-copy em','.equipment-help','.spell-range','.spell-limit-bar small','.item-row small','.pending-label','.ready-label','.container-contents-label')
def palette(selector,prop):
 if 'danger' in selector or 'field-error' in selector or 'warning' in selector or 'form-error' in selector or 'merchant-error' in selector or 'field-invalid' in selector or 'aria-invalid' in selector:return '--danger' if prop=='color' or prop.startswith(('border','outline')) else '--surface'
 if prop=='color':
  if '.primary' in selector:return '--button-fg'
  if '.nav-item' in selector or '.party-person' in selector or selector in ('.brand','.brand-mark','.sidebar','.nav-label','.sidebar-bottom p','.tiny-ornament','.edition'):return '--sidebar-ink'
  return '--muted' if any(t in selector for t in meta) else '--ink'
 if prop.startswith('border') or prop.startswith('outline'):
  if prop.startswith('outline'):return '--accent'
  if 'artifact' in selector:return '--artifact-line'
  if 'magical' in selector or 'magic-filled' in selector or 'item-magic' in selector:return '--magic-line'
  if 'equipped-container' in selector or '.equipment-slot.filled' in selector:return '--equipped-line'
  if 'container' in selector:return '--container-line'
  return '--line'
 if prop.startswith('background'):
  if selector==':root' or selector=='.topbar':return '--bg'
  if selector=='.sidebar':return '--sidebar-bg'
  if selector=='.sidebar nav':return '--bg'
  if '.nav-item.active' in selector or '.nav-item:hover' in selector or '.party-person.selected' in selector or '.party-person:hover' in selector:return '--sidebar-active'
  if '.primary' in selector:return '--button-bg'
  if 'artifact' in selector:return '--artifact-bg'
  if 'magical' in selector or 'magic-filled' in selector or 'item-magic' in selector:return '--magic-bg'
  if 'equipped-container' in selector or '.equipment-slot.filled' in selector:return '--equipped-bg'
  if 'container-contents' in selector:return '--container-inner'
  if 'container' in selector:return '--container-bg'
  if '.prof-dot.filled' in selector or '.health-bar>i' in selector or '.ardor-track i.filled' in selector:return '--accent'
  if any(t in selector for t in ('.selected','.active','.on','.used','.obtained','.hero','.empty-state','.item-spell-empty','.draft-note','.choice-banner','.spell-limit-bar','.card-top','.room-note-heading')):return '--subtle'
  return '--surface'
 return '--line'
def transform(text):
 out=[];pos=0
 while pos<len(text):
  brace=text.find('{',pos)
  if brace<0:out.append(text[pos:]);break
  selector=text[pos:brace].strip();depth=1;i=brace+1;quote=None
  while i<len(text) and depth:
   c=text[i]
   if quote:
    if c==quote and text[i-1]!='\\':quote=None
   elif c in '\"\'':quote=c
   elif c=='{':depth+=1
   elif c=='}':depth-=1
   i+=1
  body=text[brace+1:i-1];pos=i
  # Keep comments outside the selector so the generated blocks remain readable.
  comment=''
  if '*/' in selector:
   at=selector.rindex('*/')+2;comment=selector[:at]+'\n';selector=selector[at:].strip()
  if selector.startswith('@'):
   out.append(comment+selector+'{'+(body if 'print' in selector else transform(body))+'}');continue
  for sel in split_selectors(selector):
   ds=[]
   for d in body.split(';'):
    prop,sep,val=d.partition(':');prop=prop.strip()
    if not sep:continue
    if prop in ('color','background','background-color') and '#' in val:val='var('+palette(sel,prop)+')'+('!important' if '!important' in val else '')
    elif prop.startswith(('border','outline')) and '#' in val:val=re.sub(r'#[0-9a-fA-F]{3,8}\b','var('+palette(sel,prop)+')',val)
    elif prop in ('box-shadow','text-shadow') and '#' in val:val='none'
    elif prop=='opacity' and sel=='.equipment-slot.empty':val='1'
    ds.append(prop+':'+val)
   out.append(comment+sel+'{'+ ';'.join(ds)+'}');comment=''
 return '\n'.join(out)+'\n'
p.write_text((preamble+transform(s)).rstrip()+'\n',encoding='utf-8')
