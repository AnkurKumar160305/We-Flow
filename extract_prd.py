import docx
import json
import os

def extract_docx(file_path):
    doc = docx.Document(file_path)
    content = []
    
    # Simple iteration through paragraphs and tables in order
    # Note: This might not maintain exact interleaving if there are complex structures,
    # but it's often sufficient for PRDs.
    # To get exact order, we can use the underlying XML elements.
    
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    def iter_block_items(parent):
        if isinstance(parent, docx.document.Document):
            parent_elm = parent.element.body
        else:
            raise ValueError("Unsupported parent type")

        for child in parent_elm.iterchildren():
            if isinstance(child, CT_P):
                yield Paragraph(child, parent)
            elif isinstance(child, CT_Tbl):
                yield Table(child, parent)

    for block in iter_block_items(doc):
        if isinstance(block, Paragraph):
            text = block.text.strip()
            if text:
                content.append({"type": "paragraph", "text": text})
        elif isinstance(block, Table):
            table_data = []
            for row in block.rows:
                row_data = [cell.text.strip() for cell in row.cells]
                table_data.append(row_data)
            content.append({"type": "table", "data": table_data})
            
    return content

if __name__ == "__main__":
    prd_path = "WeFlow_V5_PRD.docx"
    if os.path.exists(prd_path):
        try:
            data = extract_docx(prd_path)
            with open("prd_content.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print("Extraction complete. Output saved to prd_content.json")
        except Exception as e:
            print(f"Error during extraction: {e}")
    else:
        print(f"File {prd_path} not found.")
