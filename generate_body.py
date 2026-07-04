#!/usr/bin/env python3
"""Generate META-PROMPT-MAITRE.pdf body using ReportLab."""

import sys, os, re, hashlib, textwrap
from io import StringIO

# ── Path setup ──
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
_scripts = os.path.join(PDF_SKILL_DIR, "scripts")
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm, inch
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, CondPageBreak, HRFlowable,
    ListFlowable, ListItem, Preformatted, XPreformatted,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate, Frame
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import platform

# ── Font Registration ──
_IS_MAC = platform.system() == 'Darwin'
FONT_DIR = os.path.expanduser('~/.openclaw/workspace/fonts') if _IS_MAC else '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMono', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuMono-Bold', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono-Bold.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
# NotoSansSC variable font - skip for this document (French/Latin text)

registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                    italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuMono', normal='DejaVuMono', bold='DejaVuMono-Bold')
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

try:
    from pdf import install_font_fallback
    install_font_fallback()
except:
    pass

# ── Cascade Palette (energy intent, amber/gold) ──
PAGE_BG       = colors.HexColor('#f2f1f0')
SECTION_BG    = colors.HexColor('#f1f0ef')
CARD_BG       = colors.HexColor('#f0eeec')
TABLE_STRIPE  = colors.HexColor('#f5f4f3')
HEADER_FILL   = colors.HexColor('#685949')
COVER_BLOCK   = colors.HexColor('#756453')
BORDER        = colors.HexColor('#d1c8c0')
ICON_COLOR    = colors.HexColor('#a47546')
ACCENT        = colors.HexColor('#94591e')
ACCENT_2      = colors.HexColor('#733ea8')
TEXT_PRIMARY   = colors.HexColor('#191817')
TEXT_MUTED     = colors.HexColor('#807b76')
SEM_SUCCESS   = colors.HexColor('#447b56')
SEM_WARNING   = colors.HexColor('#a98b50')
SEM_ERROR     = colors.HexColor('#ae544c')
SEM_INFO      = colors.HexColor('#56799d')

AMBER = colors.HexColor('#D97706')
AMBER_LIGHT = colors.HexColor('#FEF3C7')
AMBER_DARK = colors.HexColor('#92400E')

# ── Styles ──
W, H = A4
MARGIN = 1.8 * cm

styles = getSampleStyleSheet()

sH1 = ParagraphStyle('H1', fontName='FreeSerif-Bold', fontSize=20, leading=26,
                       textColor=ACCENT, spaceBefore=18, spaceAfter=8,
                       alignment=TA_LEFT, keepWithNext=True)
sH2 = ParagraphStyle('H2', fontName='FreeSerif-Bold', fontSize=15, leading=20,
                       textColor=HEADER_FILL, spaceBefore=14, spaceAfter=6,
                       alignment=TA_LEFT, keepWithNext=True)
sH3 = ParagraphStyle('H3', fontName='FreeSerif-Bold', fontSize=12.5, leading=16,
                       textColor=ACCENT, spaceBefore=10, spaceAfter=4,
                       alignment=TA_LEFT, keepWithNext=True)
sH4 = ParagraphStyle('H4', fontName='FreeSerif-Bold', fontSize=11, leading=14,
                       textColor=TEXT_PRIMARY, spaceBefore=8, spaceAfter=3,
                       alignment=TA_LEFT, keepWithNext=True)
sBody = ParagraphStyle('Body', fontName='FreeSerif', fontSize=10, leading=15,
                        textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=4,
                        alignment=TA_JUSTIFY, firstLineIndent=0)
sBodyLeft = ParagraphStyle('BodyLeft', fontName='FreeSerif', fontSize=10, leading=15,
                            textColor=TEXT_PRIMARY, spaceBefore=2, spaceAfter=4,
                            alignment=TA_LEFT)
sBullet = ParagraphStyle('Bullet', fontName='FreeSerif', fontSize=10, leading=15,
                          textColor=TEXT_PRIMARY, spaceBefore=1, spaceAfter=1,
                          alignment=TA_LEFT, leftIndent=18, bulletIndent=6)
sBlockquote = ParagraphStyle('Blockquote', fontName='FreeSerif-Italic', fontSize=10, leading=15,
                              textColor=TEXT_MUTED, spaceBefore=6, spaceAfter=6,
                              alignment=TA_LEFT, leftIndent=20, borderColor=ACCENT,
                              borderWidth=2, borderPadding=8)
sCode = ParagraphStyle('Code', fontName='DejaVuMono', fontSize=7.5, leading=10,
                        textColor=TEXT_PRIMARY, spaceBefore=4, spaceAfter=4,
                        alignment=TA_LEFT, leftIndent=0, backColor=colors.HexColor('#F5F5F0'),
                        borderColor=BORDER, borderWidth=0.5, borderPadding=6)
sCodeInline = ParagraphStyle('CodeInline', fontName='DejaVuMono', fontSize=8.5,
                              textColor=AMBER_DARK, backColor=AMBER_LIGHT,
                              borderColor=BORDER, borderWidth=0.3, borderPadding=2,
                              spaceBefore=0, spaceAfter=0)
sTableHeader = ParagraphStyle('TH', fontName='FreeSerif-Bold', fontSize=8.5, leading=11,
                               textColor=colors.white, alignment=TA_LEFT,
                               leftIndent=4, rightIndent=4)
sTableCell = ParagraphStyle('TC', fontName='FreeSerif', fontSize=8.5, leading=11,
                             textColor=TEXT_PRIMARY, alignment=TA_LEFT,
                             leftIndent=4, rightIndent=4)
sTableCellLeft = ParagraphStyle('TCL', fontName='DejaVuMono', fontSize=7.5, leading=10,
                                 textColor=TEXT_PRIMARY, alignment=TA_LEFT,
                                 leftIndent=4, rightIndent=4)
sTocH0 = ParagraphStyle('TOCH0', fontName='FreeSerif-Bold', fontSize=12, leading=20,
                          textColor=ACCENT, leftIndent=0)
sTocH1 = ParagraphStyle('TOCH1', fontName='FreeSerif', fontSize=10, leading=18,
                          textColor=TEXT_PRIMARY, leftIndent=20)

# ── Page numbering ──
# Zone 1: Cover (no number), Zone 2: TOC (roman), Zone 3: Body (arabic from 1)
# Since cover is separate PDF, we only need TOC + body here.
# We'll use a simple approach: TOC pages get roman, body pages get arabic.

body_page_offset = [0]  # will be set after TOC
toc_page_count = [0]

def footer_toc(canvas, doc):
    """Roman numeral footer for TOC pages."""
    canvas.saveState()
    canvas.setFont('FreeSerif', 9)
    canvas.setFillColor(TEXT_MUTED)
    roman = {1:'i',2:'ii',3:'iii',4:'iv',5:'v',6:'vi',7:'vii',8:'viii',9:'ix',10:'x'}
    page_str = roman.get(doc.page, str(doc.page))
    canvas.drawCentredString(W / 2, 0.6 * cm, page_str)
    canvas.restoreState()

def footer_body(canvas, doc):
    """Arabic number footer for body pages, offset so body starts at 1."""
    canvas.saveState()
    canvas.setFont('FreeSerif', 9)
    canvas.setFillColor(TEXT_MUTED)
    page_num = doc.page - toc_page_count[0]
    if page_num < 1:
        page_num = 1
    canvas.drawCentredString(W / 2, 0.6 * cm, str(page_num))
    # Thin amber line at top
    canvas.setStrokeColor(AMBER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, H - MARGIN + 4, W - MARGIN, H - MARGIN + 4)
    canvas.restoreState()

def no_footer(canvas, doc):
    pass

# ── TocDocTemplate with afterFlowable for TOC notification ──
class TocDocTemplate(BaseDocTemplate):
    def __init__(self, *args, **kwargs):
        BaseDocTemplate.__init__(self, *args, **kwargs)
        self.page_count_after_toc = 0

    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

# ── Helper functions ──
def esc(text):
    """Escape XML special characters and handle inline code/bold/italic."""
    if not text:
        return ''
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    # Handle inline code
    parts = re.split(r'(`[^`]+`)', text)
    result = []
    for part in parts:
        if part.startswith('`') and part.endswith('`'):
            code_text = part[1:-1]
            result.append(f'<font name="DejaVuMono" size="8" color="{AMBER_DARK.hexval()}">{esc_plain(code_text)}</font>')
        else:
            # Handle bold **text**
            parts2 = re.split(r'(\*\*[^*]+\*\*)', part)
            for p2 in parts2:
                if p2.startswith('**') and p2.endswith('**'):
                    result.append(f'<b>{p2[2:-2]}</b>')
                else:
                    result.append(p2)
    return ''.join(result)

def esc_plain(text):
    """Escape only XML special chars, no formatting."""
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    return text

def add_heading(text, style, level=0):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:8]}'
    p = Paragraph(f'<a name="{key}"/>{esc(text)}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def build_table(data_rows, col_widths=None, font_name='FreeSerif'):
    """Build a safe table with Paragraph-wrapped cells."""
    available = W - 2 * MARGIN
    n_cols = len(data_rows[0]) if data_rows else 0

    wrapped = []
    for i, row in enumerate(data_rows):
        wrow = []
        for j, cell in enumerate(row):
            if i == 0:
                wrow.append(Paragraph(esc_plain(str(cell)), sTableHeader))
            elif j == 0 and any(c.isascii() and (c in '=|-' or c in '+') for c in str(cell)[:5]):
                wrow.append(Paragraph(esc_plain(str(cell)), sTableCellLeft))
            else:
                wrow.append(Paragraph(esc(str(cell)), sTableCell))
        wrapped.append(wrow)

    if col_widths is None:
        if n_cols > 0:
            # Weight columns by content width
            from reportlab.pdfbase.pdfmetrics import stringWidth
            max_widths = [0.0] * n_cols
            for row in data_rows:
                for ci, cell in enumerate(row):
                    if ci < n_cols:
                        w = stringWidth(str(cell), 'FreeSerif', 8.5) + 16
                        max_widths[ci] = max(max_widths[ci], w)
            total_natural = sum(max_widths)
            if total_natural <= available:
                extra = available - total_natural
                col_widths = [w + extra * (w / total_natural) for w in max_widths]
            else:
                col_widths = [available * (w / total_natural) for w in max_widths]
        else:
            col_widths = [available]

    # Safety: ensure total <= available
    total = sum(col_widths)
    if total > available + 0.5:
        scale = available / total
        col_widths = [w * scale for w in col_widths]

    t = Table(wrapped, colWidths=col_widths, repeatRows=1, hAlign='LEFT')
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.4, BORDER),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ]
    # Stripe odd rows
    for i in range(1, len(wrapped)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), TABLE_STRIPE))
    t.setStyle(TableStyle(style_cmds))
    return t

def build_code_block(code_text):
    """Build a code block with monospace font and background."""
    escaped = esc_plain(code_text)
    p = Paragraph(escaped, sCode)
    return p

# ── Parse Markdown ──
def parse_markdown(filepath):
    """Parse markdown file into a list of ReportLab flowables."""
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    story = []
    i = 0
    in_code_block = False
    code_buffer = []
    in_table = False
    table_rows = []
    in_blockquote = False
    bq_buffer = []

    def flush_code():
        nonlocal code_buffer
        if code_buffer:
            code_text = '\n'.join(code_buffer)
            story.append(build_code_block(code_text))
            code_buffer = []

    def flush_table():
        nonlocal table_rows
        if table_rows and len(table_rows) > 1:
            # Filter separator row (|---|---|)
            filtered = []
            for r in table_rows:
                cells = [c.strip() for c in r.split('|')[1:-1]]
                if cells and all(re.match(r'^[-:]+$', c) for c in cells if c):
                    continue  # skip separator
                filtered.append(cells)
            if filtered and len(filtered) >= 2:
                available = W - 2 * MARGIN
                n_cols = len(filtered[0])
                col_widths = [available / n_cols] * n_cols
                story.append(build_table(filtered, col_widths))
        table_rows = []

    def flush_blockquote():
        nonlocal bq_buffer
        if bq_buffer:
            text = ' '.join(bq_buffer)
            # Add left border via a table
            inner = Paragraph(esc(text), ParagraphStyle('BQInner', fontName='FreeSerif-Italic',
                          fontSize=10, leading=15, textColor=TEXT_MUTED, alignment=TA_LEFT))
            t = Table([[inner]], colWidths=[W - 2*MARGIN - 10])
            t.setStyle(TableStyle([
                ('LEFTPADDING', (0,0), (-1,-1), 12),
                ('RIGHTPADDING', (0,0), (-1,-1), 4),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('LINEBEFOREPADDINGLEFT', (0,0), (0,-1), 3),
                ('LINEBEFORE', (0,0), (0,-1), 2.5, AMBER),
                ('LINEBEFOREPADDINGRIGHT', (0,0), (0,-1), 10),
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FFFDF5')),
            ]))
            story.append(t)
            bq_buffer = []

    while i < len(lines):
        line = lines[i].rstrip('\n')
        stripped = line.strip()

        # ── Code block ──
        if stripped.startswith('```'):
            if in_code_block:
                flush_code()
                in_code_block = False
            else:
                flush_table()
                flush_blockquote()
                in_code_block = True
                code_buffer = []
            i += 1
            continue

        if in_code_block:
            code_buffer.append(line)
            i += 1
            continue

        # ── Table detection ──
        if stripped.startswith('|') and stripped.endswith('|') and '|' in stripped[1:-1]:
            if not in_table:
                flush_blockquote()
                in_table = True
                table_rows = []
            table_rows.append(stripped)
            i += 1
            continue
        elif in_table:
            flush_table()
            in_table = False

        # ── Blockquote ──
        if stripped.startswith('>'):
            flush_table()
            in_blockquote = True
            # Remove leading >
            bq_text = stripped.lstrip('>').strip()
            if bq_text:
                bq_buffer.append(bq_text)
            i += 1
            continue
        elif in_blockquote:
            flush_blockquote()
            in_blockquote = False

        # ── Horizontal rule ──
        if stripped in ('---', '***', '___'):
            flush_table()
            flush_blockquote()
            story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER,
                                     spaceBefore=8, spaceAfter=8))
            i += 1
            continue

        # ── Empty line ──
        if not stripped:
            i += 1
            continue

        # ── Headings ──
        h_match = re.match(r'^(#{1,4})\s+(.+)$', stripped)
        if h_match:
            flush_table()
            flush_blockquote()
            level = len(h_match.group(1))
            text = h_match.group(2).strip()
            if level == 1:
                # Check for numbered section pattern: "1. Title" or just title
                story.append(CondPageBreak(H * 0.25))
                story.append(add_heading(text, sH1, level=0))
            elif level == 2:
                story.append(add_heading(text, sH2, level=1))
            elif level == 3:
                story.append(add_heading(text, sH3, level=1))
            elif level == 4:
                story.append(add_heading(text, sH4, level=1))
            i += 1
            continue

        # ── List items ──
        li_match = re.match(r'^(\s*)([-*+]|\d+\.)\s+(.+)$', stripped)
        if li_match:
            flush_table()
            flush_blockquote()
            indent = len(li_match.group(1))
            bullet = li_match.group(2)
            text = li_match.group(3)
            # Use bullet style
            story.append(Paragraph(f'<bullet>{bullet}</bullet>{esc(text)}', sBullet))
            i += 1
            continue

        # ── Regular paragraph ──
        flush_table()
        flush_blockquote()
        story.append(Paragraph(esc(stripped), sBody))
        i += 1

    # Flush remaining
    flush_code()
    flush_table()
    flush_blockquote()

    return story


# ── Build Document ──
OUTPUT_PATH = '/home/z/my-project/META-PROMPT-MAITRE-body.pdf'
MD_PATH = '/home/z/my-project/META-PROMPT-MAITRE.md'

# Create frames
frame_toc = Frame(MARGIN, MARGIN, W - 2*MARGIN, H - 2*MARGIN, id='toc')
frame_body = Frame(MARGIN, MARGIN, W - 2*MARGIN, H - 2*MARGIN, id='body')

# Page templates
pt_toc = PageTemplate(id='toc', frames=[frame_toc], onPage=footer_toc)
pt_body = PageTemplate(id='body', frames=[frame_body], onPage=footer_body)

doc = TocDocTemplate(
    OUTPUT_PATH,
    pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
)
doc.addPageTemplates([pt_toc, pt_body])

# ── Build story ──
story = []

# TOC
story.append(Paragraph('Table des matieres', ParagraphStyle('TOCTitle', fontName='FreeSerif-Bold',
             fontSize=22, leading=28, textColor=ACCENT, spaceBefore=20, spaceAfter=16, alignment=TA_LEFT)))
story.append(HRFlowable(width="40%", thickness=2, color=ACCENT, spaceBefore=0, spaceAfter=12))

toc = TableOfContents()
toc.levelStyles = [sTocH0, sTocH1]
story.append(toc)

# Switch to body template
from reportlab.platypus import NextPageTemplate
story.append(NextPageTemplate('body'))
story.append(PageBreak())

# Parse markdown content (skip first H1 title and TOC section)
with open(MD_PATH, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where TOC ends (after the --- following TOC section)
toc_end = 0
in_toc = False
for idx, line in enumerate(lines):
    stripped = line.strip()
    if stripped == '## Table des matières':
        in_toc = True
        continue
    if in_toc and stripped == '---':
        toc_end = idx + 1
        break

# Parse only body content (after TOC)
body_lines = lines[toc_end:]
body_text = ''.join(body_lines)

# Write temp file for the body portion
import tempfile
tmp_md = tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8')
tmp_md.write(body_text)
tmp_md.close()

body_flowables = parse_markdown(tmp_md.name)
os.unlink(tmp_md.name)

# Filter out the first H1 (duplicate of cover title)
skip_first_h1 = True
for flow in body_flowables:
    if skip_first_h1 and hasattr(flow, 'bookmark_level') and flow.bookmark_level == 0:
        # Check if it's the main title
        txt = getattr(flow, 'bookmark_text', '')
        if 'Meta-Prompt' in txt or 'meta-prompt' in txt.lower():
            skip_first_h1 = False
            continue
    story.append(flow)

# ── Build ──
doc.multiBuild(story)
print(f"Body PDF generated: {OUTPUT_PATH}")

# Count TOC pages for footer offset
from pypdf import PdfReader
reader = PdfReader(OUTPUT_PATH)
total_pages = len(reader.pages)
print(f"Total pages: {total_pages}")