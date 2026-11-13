"""把 Noto Sans SC（OFL）切成只含片子里出现的字的子集 → fonts/NotoSansSC-sub.ttf。
照 styles/transit-map/demo/tools/subset.py 的写法（那份改编自 Lemo-Opuscar Transit Map，MIT, (c) 2026 LemoLab）。
    .venv/bin/python -I styles/miniature/demo/tools/subset.py      （tools/fonts.sh 会调用它）"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(HERE)
txt = ''.join(open(os.path.join(D, f), encoding='utf-8').read() for f in ['timeline.js', 'model.js', 'kit.js', 'main.js'])
chars = sorted(set(ch for ch in txt if ord(ch) > 0x2E7F) | set('0123456789·→←↓↑，、'))
open(os.path.join(HERE, 'chars.txt'), 'w', encoding='utf-8').write(''.join(chars))
from fontTools import subset
subset.main([os.path.join(HERE, 'NotoSansSC-VF.ttf'), '--text-file=' + os.path.join(HERE, 'chars.txt'),
             '--output-file=' + os.path.join(D, 'fonts', 'NotoSansSC-sub.ttf'), '--layout-features=*', '--no-hinting'])
print(len(chars), '个字 → fonts/NotoSansSC-sub.ttf')
