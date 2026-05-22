import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Document from '@/models/Document';
import Vehicle from '@/models/Vehicle';
import { differenceInDays, parseISO } from 'date-fns';
import { sendEmail, getNotificationConfig } from '@/lib/notifications';
import { getSession } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  
  const sessionUser = await getSession();

  if (!isCron && !sessionUser) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await connectToDatabase();
    
    // Populate vehicle and user
    const documents = await Document.find()
      .populate({
        path: 'vehicle_id',
        populate: {
          path: 'user_id',
          model: 'User'
        }
      })
      .lean();

    let targetDocuments = documents;
    if (!isCron && sessionUser) {
      targetDocuments = documents.filter(doc => {
        if (!doc?.vehicle_id?.user_id) return false;
        const uid = doc.vehicle_id.user_id._id 
          ? doc.vehicle_id.user_id._id.toString() 
          : doc.vehicle_id.user_id.toString();
        return uid === sessionUser.id;
      });
    }

    const vehiclesAlerts = {};
    const today = new Date();
    let totalExpired = 0;
    let totalExpiringSoon = 0;

    targetDocuments.forEach((doc) => {
      const vehicle = doc.vehicle_id;
      if (!vehicle) return; // In case of orphaned document
      
      const user = vehicle.user_id;
      
      const expiryDate = new Date(doc.expiry_date);
      const daysLeft = differenceInDays(expiryDate, today);

      let status = null;
      if (daysLeft < 0) {
        status = 'expired';
        totalExpired++;
      } else if (daysLeft <= 30) {
        status = 'expiring_soon';
        totalExpiringSoon++;
      }

      if (status) {
        const vehicleStrId = vehicle._id.toString();
        if (!vehiclesAlerts[vehicleStrId]) {
          vehiclesAlerts[vehicleStrId] = {
            vehicle_name: vehicle.name,
            license_plate: vehicle.license_plate,
            owner_email: vehicle.owner_email,
            user_email: user ? user.email : null,
            owner_phone: vehicle.owner_phone,
            fcm_token: vehicle.owner_fcm_token || (user ? user.fcm_token : null),
            documents: []
          };
        }
        
        // Format expiry date as YYYY-MM-DD for consistency
        const formattedDate = expiryDate.toISOString().split('T')[0];
        
        vehiclesAlerts[vehicleStrId].documents.push({
          type: doc.type,
          expiry_date: formattedDate,
          daysLeft,
          status,
        });
      }
    });

    const config = getNotificationConfig();
    const alertsSent = [];

    for (const vehicleId in vehiclesAlerts) {
      const vehicle = vehiclesAlerts[vehicleId];
      
      let messageLines = [
        `Vehicle Alert: ${vehicle.vehicle_name} (${vehicle.license_plate})`,
        `The following documents require your attention:`,
        ``
      ];

      let hasExpired = false;
      vehicle.documents.forEach(doc => {
        const isExpired = doc.status === 'expired';
        if (isExpired) hasExpired = true;
        const statusText = isExpired ? 'EXPIRED' : `expiring in ${doc.daysLeft} days`;
        messageLines.push(`- ${doc.type}: ${statusText} (Expiry: ${doc.expiry_date})`);
      });

      messageLines.push(``, `Please renew immediately.`);
      const message = messageLines.join('\n');
      
      const subject = `Document Alert: ${vehicle.license_plate} - ${hasExpired ? 'Expired' : 'Expiring Soon'}`;

      let emailResult = null;

      const emailsToSend = new Set();
      if (vehicle.owner_email) emailsToSend.add(vehicle.owner_email);
      if (vehicle.user_email) emailsToSend.add(vehicle.user_email);

      const emailResults = [];
      for (const email of emailsToSend) {
        const res = await sendEmail(email, subject, message);
        emailResults.push(res);
      }
      if (emailResults.length > 0) {
        emailResult = emailResults[0];
      }

      alertsSent.push({
        vehicle: vehicle.license_plate,
        documentCount: vehicle.documents.length,
        message,
        ownerEmail: vehicle.owner_email || null,
        userEmail: vehicle.user_email || null,
        emailResult,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${targetDocuments.length} documents. Found ${totalExpired} expired and ${totalExpiringSoon} expiring soon across ${Object.keys(vehiclesAlerts).length} vehicles.`,
      config,
      alertsSent,
    });
  } catch (error) {
    console.error('Alert processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
