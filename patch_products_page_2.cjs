const fs = require('fs');

const path = 'c:\\Users\\HP\\Desktop\\Short Film\\icarry-vyra-complete\\app\\admin\\products\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update formData initial state
content = content.replace(
  /stock_quantity: '100',/,
  `stock_quantity: '100',\n      keywords: '',\n      coupon: '',`
);

// 2. Update openEditModal
content = content.replace(
  /stock_quantity: product\.stock_quantity\?\.toString\(\) \|\| '100',/,
  `stock_quantity: product.stock_quantity?.toString() || '100',\n        keywords: product.keywords || '',\n        coupon: product.coupon || '',`
);

// 3. Update payload
content = content.replace(
  /stock_quantity: parseInt\(formData\.stock_quantity\) \|\| 0,/,
  `stock_quantity: parseInt(formData.stock_quantity) || 0,\n          keywords: formData.keywords,\n          coupon: formData.coupon,`
);

// 4. Inject JSX fields
const insertionRegex = /<div className="form-group">\s*<label>Stock Quantity<\/label>[\s\S]*?<\/div>\s*<\/div>/;
const replacementJSX = `<div className="form-group">
                        <label>Stock Quantity</label>
                        <input
                          type="number"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Keywords (SEO)</label>
                        <input
                          type="text"
                          value={formData.keywords}
                          onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                          placeholder="comma separated keywords"
                        />
                      </div>
                      <div className="form-group">
                        <label>Coupon Code</label>
                        <input
                          type="text"
                          value={formData.coupon}
                          onChange={(e) => setFormData({ ...formData, coupon: e.target.value })}
                          placeholder="Optional coupon"
                        />
                      </div>
                    </div>`;

content = content.replace(insertionRegex, replacementJSX);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched page successfully!");
