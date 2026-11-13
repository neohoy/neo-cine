"""把 Noto Sans SC（OFL）切成只含片子里出现的字的子集 → fonts/NotoSansSC-sub.ttf。
照 styles/transit-map/demo/tools/subset.py 的写法（那份改编自 Lemo-Opuscar Transit Map，MIT, (c) 2026 LemoLab）。
    .venv/bin/python -I styles/miniature/demo/tools/subset.py      （tools/fonts.sh 会调用它）"""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.dirname(HERE)
import glob
# 片子里印出来的字只在 main.js（讲解、标题、片尾）里；kit/ 和 station.js 也读进来，换场景描述时不会漏字
files = ['main.js', 'station.js'] + sorted(glob.glob(os.path.join(D, 'kit', '*.js')))
txt = ''.join(open(os.path.join(D, f), encoding='utf-8').read() for f in files)
chars = sorted(set(ch for ch in txt if ord(ch) > 0x2E7F) | set('0123456789·→←↓↑，、'))
open(os.path.join(HERE, 'chars.txt'), 'w', encoding='utf-8').write(''.join(chars))
from fontTools import subset
subset.main([os.path.join(HERE, 'NotoSansSC-VF.ttf'), '--text-file=' + os.path.join(HERE, 'chars.txt'),
             '--output-file=' + os.path.join(D, 'fonts', 'NotoSansSC-sub.ttf'), '--layout-features=*', '--no-hinting'])
print(len(chars), '个字 → fonts/NotoSansSC-sub.ttf')
