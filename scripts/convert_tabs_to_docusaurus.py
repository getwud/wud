#!/usr/bin/env python3
"""
Convert Docsify HTML tab syntax to Docusaurus MDX Tabs (<Tabs> and <TabItem>).
"""

import os
import sys
import glob
import re

def convert_tab_block(block_match):
    block = block_match.group(1)
    
    # Matches tab headers such as:
    # 1. <!-- tab:Label -->
    # 2. #### **Label**
    # 3. ### **Label**
    # 4. #### Label
    # 5. ### Label
    header_pattern = re.compile(
        r'(?:<!--\s*tab:\s*(.*?)\s*-->|^#{1,6}\s*(?:(?:\*\*(.*?)\*\*)|(?:__(.*?)__)|(.*?)))\s*$',
        re.MULTILINE
    )
    
    splits = []
    for m in header_pattern.finditer(block):
        label = m.group(1) or m.group(2) or m.group(3) or m.group(4)
        if label:
            label = label.strip()
            # Clean any remaining markdown bold/italic formatting
            label = label.replace('**', '').replace('__', '').strip()
            if label:
                splits.append((m.start(), m.end(), label))
            
    if not splits:
        # Fallback if no tab headers found
        return f"<Tabs>\n<TabItem value=\"tab-1\" label=\"Tab 1\">\n\n{block.strip()}\n\n</TabItem>\n</Tabs>"
        
    tab_items = []
    for i, (start, end, label) in enumerate(splits):
        content_start = end
        content_end = splits[i+1][0] if i + 1 < len(splits) else len(block)
        tab_content = block[content_start:content_end].strip()
        
        # Generate slug for value attribute
        slug = re.sub(r'[^a-zA-Z0-9_-]+', '-', label.lower()).strip('-')
        if not slug:
            slug = f"tab-{i+1}"
            
        tab_items.append(f'<TabItem value="{slug}" label="{label}">\n\n{tab_content}\n\n</TabItem>')
        
    return "<Tabs>\n" + "\n".join(tab_items) + "\n</Tabs>"

def convert_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "<!-- tabs:start -->" not in content and "<!--tabs:start-->" not in content and "<!-- tab:" not in content:
        return False
        
    # Replace all <!-- tabs:start --> ... <!-- tabs:end --> blocks
    new_content = re.sub(
        r'<!--\s*tabs:start\s*-->(.*?)<!--\s*tabs:end\s*-->',
        convert_tab_block,
        content,
        flags=re.DOTALL
    )
    
    # Ensure imports are present at the top of the file
    imports_to_add = []
    if "import Tabs from '@theme/Tabs';" not in new_content:
        imports_to_add.append("import Tabs from '@theme/Tabs';")
    if "import TabItem from '@theme/TabItem';" not in new_content:
        imports_to_add.append("import TabItem from '@theme/TabItem';")
        
    if imports_to_add:
        import_block = "\n".join(imports_to_add) + "\n\n"
        if new_content.startswith("---"):
            parts = new_content.split("---", 2)
            if len(parts) >= 3:
                new_content = f"---{parts[1]}---\n\n{import_block}{parts[2].lstrip()}"
            else:
                new_content = import_block + new_content
        else:
            new_content = import_block + new_content
            
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    return True

def main():
    target_dirs = sys.argv[1:] if len(sys.argv) > 1 else ["website/docs"]
    total_converted = 0
    
    for target_dir in target_dirs:
        if not os.path.exists(target_dir):
            print(f"Directory not found: {target_dir}")
            continue
            
        md_files = glob.glob(os.path.join(target_dir, "**/*.md"), recursive=True) + \
                   glob.glob(os.path.join(target_dir, "**/*.mdx"), recursive=True)
                   
        print(f"Scanning {len(md_files)} files in {target_dir}...")
        for file_path in md_files:
            if convert_file(file_path):
                print(f"  [CONVERTED] {file_path}")
                total_converted += 1
                
    print(f"\nSuccessfully converted {total_converted} file(s).")

if __name__ == "__main__":
    main()
