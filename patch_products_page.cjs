const fs = require('fs');

const path = 'c:\\Users\\HP\\Desktop\\Short Film\\icarry-vyra-complete\\app\\admin\\products\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update formData initial state
content = content.replace(
  /const \[formData, setFormData\] = useState\(\{/,
  `const [formData, setFormData] = useState({\n      status: 'active',\n      brand: 'Vyra Herbals',\n      stock_quantity: '100',`
);

// 2. Update openEditModal
content = content.replace(
  /const openEditModal = \(product: Product\) => \{\s*setEditingProduct\(product\);\s*setFormData\(\{/,
  `const openEditModal = (product: Product) => {\n      setEditingProduct(product);\n      setFormData({\n        status: product.status || 'active',\n        brand: product.brand || 'Vyra Herbals',\n        stock_quantity: product.stock_quantity?.toString() || '100',`
);

// 3. Update payload
content = content.replace(
  /const payload = \{\s*\.\.\.formData,/,
  `const payload = {\n          ...formData,\n          stock_quantity: parseInt(formData.stock_quantity) || 0,`
);

// 4. Inject JSX fields
const skuRegex = /<div className="form-group">\s*<label>SKU \(Stock Keeping Unit\)<\/label>[\s\S]*?<\/div>\s*<\/div>/;
const replacementJSX = `<div className="form-group">
                        <label>SKU (Stock Keeping Unit)</label>
                        <input
                          type="text"
                          value={formData.sku || ''}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          placeholder="auto-generated-from-title"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Brand</label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                          placeholder="e.g. Vyra Herbals"
                        />
                      </div>
                      <div className="form-group">
                        <label>Stock Quantity</label>
                        <input
                          type="number"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                          placeholder="100"
                        />
                      </div>
                    </div>`;

content = content.replace(skuRegex, replacementJSX);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched successfully!");
