const STUDENT_EVALUATION_COLLECTION = 'evaluationReports';
const STUDENT_USER_COLLECTION = 'users';

function getCurrentStudentEvaluationUser() {
  return new Promise((resolve) => {
    const authInstance = firebase.auth();

    if (authInstance.currentUser) {
      resolve(authInstance.currentUser);
      return;
    }

    const unsubscribe = authInstance.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function getStudentEvaluationTimestampDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  if (value?.toDate) {
    return value.toDate();
  }

  return null;
}

function formatStudentEvaluationDateLabel(value, fallbackLabel) {
  const date = getStudentEvaluationTimestampDate(value);
  if (!date) {
    return fallbackLabel;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function escapeStudentEvaluationHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStudentEvaluationEmployerName(report, studentData) {
  return report.employerName || studentData.assignedEmployerName || 'Assigned Employer';
}

function getStudentEvaluationCoordinatorName(report, studentData) {
  return report.assignedCoordinatorName || studentData.assignedCoordinatorName || 'Coordinator';
}

function createStudentPendingEvaluationItem(report, studentData) {
  const employerName = getStudentEvaluationEmployerName(report, studentData);
  const coordinatorName = getStudentEvaluationCoordinatorName(report, studentData);
  const requestedLabel = formatStudentEvaluationDateLabel(report.requestedAt, 'Recently requested');

  return `
    <div class="term-item">
      <div class="term-info">
        <span class="term-season">${escapeStudentEvaluationHtml(employerName)}</span>
        <span class="term-employer">Coordinator: ${escapeStudentEvaluationHtml(coordinatorName)}</span>
        <span class="term-grade">Requested ${escapeStudentEvaluationHtml(requestedLabel)}</span>
      </div>
      <div class="term-status">
        <span class="status-badge pending">Pending</span>
        <span class="application-card-note">Waiting for employer upload</span>
      </div>
    </div>
  `;
}

function createStudentCompletedEvaluationItem(report, studentData) {
  const employerName = getStudentEvaluationEmployerName(report, studentData);
  const submittedLabel = formatStudentEvaluationDateLabel(report.submittedAt, 'Recently uploaded');
  const fileName = report.reportFileName || 'Evaluation report';

  return `
    <div class="term-item">
      <div class="term-info">
        <span class="term-season">${escapeStudentEvaluationHtml(employerName)}</span>
        <span class="term-employer">${escapeStudentEvaluationHtml(fileName)}</span>
        <span class="term-grade">Uploaded ${escapeStudentEvaluationHtml(submittedLabel)}</span>
      </div>
      <div class="term-status">
        <span class="status-badge completed">Completed</span>
        <a class="quick-view-btn" href="${escapeStudentEvaluationHtml(report.reportUrl)}" target="_blank" rel="noopener noreferrer">View Report</a>
      </div>
    </div>
  `;
}

function updateStudentEvaluationSummary(pendingReports, completedReports) {
  const pendingCountElement = document.getElementById('studentEvaluationPendingCount');
  const availableCountElement = document.getElementById('studentEvaluationAvailableCount');

  if (pendingCountElement) {
    pendingCountElement.textContent = String(pendingReports.length);
  }

  if (availableCountElement) {
    availableCountElement.textContent = String(completedReports.length);
  }
}

async function fetchStudentEvaluationReports(studentUid) {
  const querySnapshot = await firebase.firestore()
    .collection(STUDENT_EVALUATION_COLLECTION)
    .where('studentId', '==', studentUid)
    .get();

  const reportsById = new Map(
    querySnapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])
  );

  if (!reportsById.size) {
    const directSnapshot = await firebase.firestore()
      .collection(STUDENT_EVALUATION_COLLECTION)
      .doc(studentUid)
      .get();

    if (directSnapshot.exists) {
      reportsById.set(directSnapshot.id, {
        id: directSnapshot.id,
        ...directSnapshot.data()
      });
    }
  }

  return Array.from(reportsById.values()).sort((left, right) => {
    const leftDate = getStudentEvaluationTimestampDate(left.submittedAt || left.requestedAt)?.getTime() || 0;
    const rightDate = getStudentEvaluationTimestampDate(right.submittedAt || right.requestedAt)?.getTime() || 0;
    return rightDate - leftDate;
  });
}

async function renderStudentEvaluationReports() {
  const pendingList = document.getElementById('studentEvaluationPendingList');
  const completedList = document.getElementById('studentEvaluationCompletedList');

  if (!pendingList || !completedList) {
    return;
  }

  pendingList.innerHTML = '<div class="applications-empty-state">Loading pending evaluation reports...</div>';
  completedList.innerHTML = '<div class="applications-empty-state">Loading submitted evaluation reports...</div>';

  try {
    const currentUser = await getCurrentStudentEvaluationUser();
    if (!currentUser) {
      pendingList.innerHTML = '<div class="applications-empty-state">Unable to determine the current student.</div>';
      completedList.innerHTML = '<div class="applications-empty-state">Unable to determine the current student.</div>';
      return;
    }

    const [userSnapshot, reports] = await Promise.all([
      firebase.firestore().collection(STUDENT_USER_COLLECTION).doc(currentUser.uid).get(),
      fetchStudentEvaluationReports(currentUser.uid)
    ]);

    const studentData = userSnapshot.exists ? userSnapshot.data() : {};
    const pendingReports = reports.filter((report) => report.status === 'requested');
    const completedReports = reports.filter((report) => report.status === 'submitted' && report.reportUrl);

    updateStudentEvaluationSummary(pendingReports, completedReports);

    pendingList.innerHTML = pendingReports.length
      ? pendingReports.map((report) => createStudentPendingEvaluationItem(report, studentData)).join('')
      : '<div class="applications-empty-state">No employer evaluation uploads are pending right now.</div>';

    completedList.innerHTML = completedReports.length
      ? completedReports.map((report) => createStudentCompletedEvaluationItem(report, studentData)).join('')
      : '<div class="applications-empty-state">No evaluation reports have been uploaded yet.</div>';
  } catch (error) {
    console.error('Unable to load student evaluation reports:', error);
    pendingList.innerHTML = '<div class="applications-empty-state">Unable to load evaluation reports right now.</div>';
    completedList.innerHTML = '<div class="applications-empty-state">Unable to load evaluation reports right now.</div>';
  }
}

window.initializeStudentEvaluationReportPages = function() {
  const pendingList = document.getElementById('studentEvaluationPendingList');
  const completedList = document.getElementById('studentEvaluationCompletedList');

  if (!pendingList || !completedList) {
    return;
  }

  renderStudentEvaluationReports();
};

document.addEventListener('DOMContentLoaded', () => {
  window.initializeStudentEvaluationReportPages();
});
