const STUDENT_PROFILE_USER_COLLECTION = 'users';
const STUDENT_PROFILE_REPORT_COLLECTION = 'workTermReports';

function getCurrentStudentProfileUser() {
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

function getStudentProfileDisplayName(studentData, authUser) {
  const fullName = `${studentData.firstName || ''} ${studentData.lastName || ''}`.trim();
  return fullName || studentData.email || authUser?.email || 'Student';
}

function getStudentProfileInitials(studentData, authUser) {
  const firstInitial = String(studentData.firstName || '').trim().charAt(0);
  const lastInitial = String(studentData.lastName || '').trim().charAt(0);
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();

  if (initials) {
    return initials;
  }

  const emailInitial = String(studentData.email || authUser?.email || '').trim().charAt(0).toUpperCase();
  return emailInitial || 'S';
}

function splitStudentProfileFullName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return {
      firstName: '',
      lastName: ''
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function setStudentProfileSelectValue(selectElement, value) {
  if (!selectElement) {
    return;
  }

  const normalizedValue = String(value || '').trim();
  const existingOption = Array.from(selectElement.options).find((option) => option.value === normalizedValue);

  if (normalizedValue && !existingOption) {
    const option = document.createElement('option');
    option.value = normalizedValue;
    option.textContent = normalizedValue;
    selectElement.appendChild(option);
  }

  selectElement.value = normalizedValue;
}

function getStudentProfileWorkTermsCompleted(studentData, reportCount) {
  const storedCount = Number(studentData.workTermsCompleted);
  const normalizedStoredCount = Number.isFinite(storedCount) ? storedCount : 0;
  const normalizedReportCount = Number.isFinite(reportCount) ? reportCount : 0;
  return Math.max(normalizedStoredCount, normalizedReportCount);
}

function showStudentProfileStatus(message, type = 'success') {
  const statusElement = document.getElementById('studentProfileStatus');
  if (!statusElement) {
    return;
  }

  statusElement.hidden = false;
  statusElement.className = `profile-save-status ${type}`;
  statusElement.textContent = message;
}

function updateStudentProfileView(studentData, authUser, reportCount) {
  const fullName = getStudentProfileDisplayName(studentData, authUser);
  const program = String(studentData.program || '').trim();
  const subtitle = program ? `${program} student` : 'Student account';
  const studentIdValue =
    studentData.studentNumber ||
    studentData.studentIdNumber ||
    studentData.tmuStudentId ||
    studentData.studentId ||
    '';
  const workTermsCompleted = getStudentProfileWorkTermsCompleted(studentData, reportCount);

  const avatarElement = document.getElementById('studentProfileAvatar');
  const headingNameElement = document.getElementById('studentProfileHeadingName');
  const headingSubtitleElement = document.getElementById('studentProfileHeadingSubtitle');
  const accountStatusElement = document.getElementById('studentProfileAccountStatus');
  const emailVerifiedElement = document.getElementById('studentProfileEmailVerified');
  const workTermsStatElement = document.getElementById('studentProfileWorkTermsStat');
  const currentStandingElement = document.getElementById('studentProfileCurrentStanding');
  const assignedCoordinatorElement = document.getElementById('studentProfileAssignedCoordinator');
  const assignedEmployerElement = document.getElementById('studentProfileAssignedEmployer');

  if (avatarElement) {
    avatarElement.textContent = getStudentProfileInitials(studentData, authUser);
  }

  if (headingNameElement) {
    headingNameElement.textContent = fullName;
  }

  if (headingSubtitleElement) {
    headingSubtitleElement.textContent = subtitle;
  }

  if (accountStatusElement) {
    accountStatusElement.textContent = studentData.accountStatus || 'Active';
  }

  if (emailVerifiedElement) {
    emailVerifiedElement.textContent = authUser?.emailVerified ? 'Yes' : 'No';
  }

  if (workTermsStatElement) {
    workTermsStatElement.textContent = String(workTermsCompleted);
  }

  if (currentStandingElement) {
    currentStandingElement.textContent = studentData.currentStanding || 'Not available';
  }

  if (assignedCoordinatorElement) {
    assignedCoordinatorElement.textContent = studentData.assignedCoordinatorName || 'Not assigned';
  }

  if (assignedEmployerElement) {
    assignedEmployerElement.textContent = studentData.assignedEmployerName || 'Not assigned';
  }

  const fullNameInput = document.getElementById('studentFullName');
  const emailInput = document.getElementById('studentEmail');
  const studentIdInput = document.getElementById('studentId');
  const programSelect = document.getElementById('studentProgram');
  const expectedGradInput = document.getElementById('studentExpectedGrad');
  const termsCompletedInput = document.getElementById('studentTermsCompleted');

  if (fullNameInput) {
    fullNameInput.value = fullName;
  }

  if (emailInput) {
    emailInput.value = studentData.email || authUser?.email || '';
  }

  if (studentIdInput) {
    studentIdInput.value = studentIdValue;
  }

  setStudentProfileSelectValue(programSelect, program);

  if (expectedGradInput) {
    expectedGradInput.value = studentData.expectedGraduation || '';
  }

  if (termsCompletedInput) {
    termsCompletedInput.value = String(workTermsCompleted);
  }
}

async function loadStudentProfileContext() {
  const authUser = await getCurrentStudentProfileUser();
  if (!authUser) {
    throw new Error('You must be signed in to view this profile.');
  }

  const userRef = firebase.firestore().collection(STUDENT_PROFILE_USER_COLLECTION).doc(authUser.uid);
  const userDoc = await userRef.get();
  const studentData = userDoc.exists ? userDoc.data() : {};

  if (window.assignStudentRelationshipsIfMissing) {
    const assignmentUpdate = await window.assignStudentRelationshipsIfMissing(authUser.uid, studentData);
    if (Object.keys(assignmentUpdate).length) {
      Object.assign(studentData, assignmentUpdate);
    }
  }

  let reportCount = Number(studentData.workTermsCompleted || 0);

  try {
    const reportSnapshot = await firebase.firestore()
      .collection(STUDENT_PROFILE_REPORT_COLLECTION)
      .where('userId', '==', authUser.uid)
      .get();
    reportCount = getStudentProfileWorkTermsCompleted(studentData, reportSnapshot.size);
  } catch (error) {
    console.error('Unable to load student work term count:', error);
  }

  return {
    authUser,
    studentData,
    reportCount
  };
}

window.initializeStudentProfilePage = function() {
  const saveButton = document.getElementById('saveProfile');
  const fullNameInput = document.getElementById('studentFullName');
  const programSelect = document.getElementById('studentProgram');
  const expectedGradInput = document.getElementById('studentExpectedGrad');

  if (!saveButton || !fullNameInput || !programSelect || !expectedGradInput) {
    return;
  }

  if (saveButton.dataset.studentProfileBound === 'true') {
    return;
  }

  saveButton.dataset.studentProfileBound = 'true';

  [fullNameInput, programSelect, expectedGradInput].forEach((element) => {
    element.addEventListener('input', () => {
      const statusElement = document.getElementById('studentProfileStatus');
      if (statusElement) {
        statusElement.hidden = true;
      }
    });

    element.addEventListener('change', () => {
      const statusElement = document.getElementById('studentProfileStatus');
      if (statusElement) {
        statusElement.hidden = true;
      }
    });
  });

  const state = {
    authUser: null,
    studentData: {},
    reportCount: 0
  };

  const loadProfile = async () => {
    saveButton.disabled = true;

    try {
      const context = await loadStudentProfileContext();
      state.authUser = context.authUser;
      state.studentData = context.studentData;
      state.reportCount = context.reportCount;
      updateStudentProfileView(state.studentData, state.authUser, state.reportCount);
    } catch (error) {
      console.error('Unable to load student profile:', error);
      showStudentProfileStatus(error.message || 'Unable to load your profile right now.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  };

  saveButton.addEventListener('click', async () => {
    const parsedName = splitStudentProfileFullName(fullNameInput.value);
    const firstName = parsedName.firstName;
    const lastName = parsedName.lastName;
    const program = programSelect.value.trim();
    const expectedGraduation = expectedGradInput.value.trim();

    if (!firstName) {
      showStudentProfileStatus('Enter your full name before saving.', 'error');
      fullNameInput.focus();
      return;
    }

    if (!state.authUser) {
      showStudentProfileStatus('Unable to save your profile right now.', 'error');
      return;
    }

    saveButton.disabled = true;

    try {
      const update = {
        firstName,
        lastName,
        program,
        expectedGraduation,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await firebase.firestore()
        .collection(STUDENT_PROFILE_USER_COLLECTION)
        .doc(state.authUser.uid)
        .set(update, { merge: true });

      state.studentData = {
        ...state.studentData,
        ...update
      };

      updateStudentProfileView(state.studentData, state.authUser, state.reportCount);
      showStudentProfileStatus('Student profile updated.', 'success');
    } catch (error) {
      console.error('Unable to save student profile:', error);
      showStudentProfileStatus('Unable to save your profile right now.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  loadProfile();
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('studentFullName')) {
    window.initializeStudentProfilePage();
  }
});
