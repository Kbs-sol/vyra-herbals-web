import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/utils/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { tryNormalizePhone } from '@/services/communications/utils/phoneNormalizer';

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const preview = searchParams.get('preview') === 'true';

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must contain a header and at least one row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    // find indices
    const nameIdx = headers.indexOf('full_name');
    const phoneIdx = headers.indexOf('mobile_number');
    const ordersIdx = headers.indexOf('total_orders');
    const lastOrderIdx = headers.indexOf('last_order_date');
    const catIdx = headers.indexOf('primary_category');

    if (nameIdx === -1 || phoneIdx === -1 || ordersIdx === -1 || lastOrderIdx === -1 || catIdx === -1) {
      return NextResponse.json({ 
        error: 'Missing required columns. Expected: full_name, mobile_number, total_orders, last_order_date, primary_category' 
      }, { status: 400 });
    }

    const parsedRows: Record<string, any>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      parsedRows.push({
        full_name: parts[nameIdx],
        mobile_number: parts[phoneIdx],
        total_orders: parseInt(parts[ordersIdx] || '0', 10),
        last_order_date: parts[lastOrderIdx],
        primary_category: parts[catIdx],
      });
    }

    const supabase = getSupabaseAdmin();
    
    // pre-fetch users to check duplicates
    const { data: existingUsers } = await supabase.from('users').select('id, phone');
    const phoneToUserId = new Map<string, string>();
    if (existingUsers) {
      for (const u of existingUsers) {
        if (u.phone) {
          const norm = tryNormalizePhone(u.phone);
          if (norm) phoneToUserId.set(norm, u.id);
        }
      }
    }

    // pre-fetch existing historical leads
    const { data: existingLeads } = await supabase.from('historical_leads').select('mobile_number');
    const existingPhones = new Set<string>();
    if (existingLeads) {
      for (const l of existingLeads) {
        existingPhones.add(l.mobile_number);
      }
    }

    let successCount = 0;
    let skippedCount = 0;
    let invalidCount = 0;
    
    const previewData: Record<string, any>[] = [];
    const inserts: Record<string, any>[] = [];

    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    for (const row of parsedRows) {
      const normPhone = tryNormalizePhone(row.mobile_number);
      if (!normPhone) {
        invalidCount++;
        continue;
      }

      if (existingPhones.has(normPhone)) {
        skippedCount++; // already in historical_leads
        if (preview && previewData.length < 10) {
          previewData.push({ ...row, status: 'skipped (duplicate)' });
        }
        continue;
      }

      let segment = 'win_back';
      if (row.total_orders >= 2) {
        segment = 'vip_repeat';
      } else if (row.total_orders === 1) {
        segment = 'win_back'; // According to logic, both < 6 and >= 6 months are win_back
      }

      const dupUserId = phoneToUserId.get(normPhone) || null;

      const record = {
        full_name: row.full_name,
        mobile_number: normPhone,
        total_orders: row.total_orders,
        last_order_date: row.last_order_date ? new Date(row.last_order_date).toISOString() : null,
        primary_category: row.primary_category,
        segment: segment,
        duplicate_of_user_id: dupUserId,
        marketing_eligible: true,
        marketing_opt_out: false
      };

      inserts.push(record);
      if (preview && previewData.length < 10) {
        previewData.push({ ...record, status: 'valid' });
      }
    }

    if (preview) {
      return NextResponse.json({
        success: true,
        stats: {
          totalRows: parsedRows.length,
          validToImport: inserts.length,
          invalidPhone: invalidCount,
          skippedDuplicate: skippedCount
        },
        preview: previewData
      });
    } else {
      // batch insert in chunks of 500
      let actualInserted = 0;
      for (let i = 0; i < inserts.length; i += 500) {
        const chunk = inserts.slice(i, i + 500);
        const { error } = await supabase.from('historical_leads').insert(chunk);
        if (error) {
          console.error('Error inserting chunk:', error);
          throw error;
        }
        actualInserted += chunk.length;
      }

      return NextResponse.json({
        success: true,
        message: 'Import complete',
        stats: {
          totalRows: parsedRows.length,
          imported: actualInserted,
          invalidPhone: invalidCount,
          skippedDuplicate: skippedCount
        }
      });
    }

  } catch (error: any) {
    console.error('Error in import:', error);
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  }
}
