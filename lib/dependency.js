import Document from '@/models/Document';
import { differenceInDays, parseISO } from 'date-fns';

/**
 * Recalculates the status of all documents for a specific vehicle.
 * Automatically maps linked dates and flags missing dependencies.
 */
export async function syncVehicleDependencies(vehicleId) {
  const documents = await Document.find({ vehicle_id: vehicleId });

  const updates = [];

  for (const doc of documents) {
    const evaluation = evaluateDocumentStatus(doc, documents);

    // Only add to update list if something changed
    if (
      doc.dependencyStatus !== evaluation.dependencyStatus ||
      doc.status !== evaluation.status ||
      (doc.expiry_date?.getTime() !== evaluation.derivedExpiryDate?.getTime()) ||
      JSON.stringify(doc.linkedDocuments) !== JSON.stringify(evaluation.linkedDocuments) ||
      doc.linkedExpirySource !== evaluation.linkedExpirySource
    ) {
      updates.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              dependencyStatus: evaluation.dependencyStatus,
              status: evaluation.status,
              expiry_date: evaluation.derivedExpiryDate,
              linkedDocuments: evaluation.linkedDocuments,
              linkedExpirySource: evaluation.linkedExpirySource
            }
          }
        }
      });
    }
  }

  if (updates.length > 0) {
    await Document.bulkWrite(updates);
  }
}

/**
 * Pure function to calculate a document's status based on its rules and the other documents available.
 */
export function evaluateDocumentStatus(document, allVehicleDocs) {
  const today = new Date();
  let dependencyStatus = 'ACTIVE';
  let status = 'valid';
  let derivedExpiryDate = document.expiry_date;
  let linkedDocuments = [];
  let linkedExpirySource = null;

  if (document.expiryType === 'FITNESS_LINKED') {
    linkedDocuments = ['Fitness'];
    const fitnessDoc = allVehicleDocs.find(d => d.type === 'Fitness');

    if (!fitnessDoc || !fitnessDoc.expiry_date) {
      dependencyStatus = 'NO_EXPIRY_FOUND';
      status = 'missing';
      derivedExpiryDate = null;
    } else {
      derivedExpiryDate = fitnessDoc.expiry_date;
      linkedExpirySource = 'Fitness';
      
      const daysLeft = differenceInDays(new Date(derivedExpiryDate), today);
      if (daysLeft < 0) {
        dependencyStatus = 'INVALID_DEPENDENCY';
        status = 'expired';
      } else if (daysLeft <= 30) {
        dependencyStatus = 'EXPIRING_SOON';
        status = 'expiring_soon';
      }
    }
  } 
  else if (document.expiryType === 'MULTI_DOCUMENT_DEPENDENT') {
    linkedDocuments = ['Fitness', 'Insurance', 'Tax'];
    let anyInvalid = false;
    let minDaysLeft = Infinity;

    // First check its own direct expiry date (if it has one)
    if (document.expiry_date) {
      const selfDaysLeft = differenceInDays(new Date(document.expiry_date), today);
      if (selfDaysLeft < 0) {
        anyInvalid = true;
      }
      minDaysLeft = selfDaysLeft;
    }

    // Then check all dependent documents
    for (const depType of linkedDocuments) {
      const depDoc = allVehicleDocs.find(d => d.type === depType);
      if (!depDoc || !depDoc.expiry_date) {
        anyInvalid = true;
        break;
      }
      const daysLeft = differenceInDays(new Date(depDoc.expiry_date), today);
      if (daysLeft < 0) {
        anyInvalid = true;
        break;
      }
      if (daysLeft < minDaysLeft) {
        minDaysLeft = daysLeft;
      }
    }

    if (anyInvalid) {
      dependencyStatus = 'INVALID_DEPENDENCY';
      status = 'expired';
    } else if (minDaysLeft <= 30) {
      dependencyStatus = 'EXPIRING_SOON';
      status = 'expiring_soon';
    }
  }
  else {
    // DIRECT or UNKNOWN type (Default fallback logic)
    if (!document.expiry_date) {
      dependencyStatus = 'NO_EXPIRY_FOUND';
      status = 'missing';
    } else {
      const daysLeft = differenceInDays(new Date(document.expiry_date), today);
      if (daysLeft < 0) {
        dependencyStatus = 'EXPIRED';
        status = 'expired';
      } else if (daysLeft <= 30) {
        dependencyStatus = 'EXPIRING_SOON';
        status = 'expiring_soon';
      } else {
        dependencyStatus = 'ACTIVE';
        status = 'valid';
      }
    }
  }

  return {
    dependencyStatus,
    status,
    derivedExpiryDate,
    linkedDocuments,
    linkedExpirySource
  };
}
