const COORDINATOR_PROFILE_USER_COLLECTION = 'users';

function getCurrentCoordinatorProfileUser() {
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

function getCoordinatorProfileDisplayName(coordinatorData, authUser) {
  const fullName = `${coordinatorData.firstName || ''} ${coordinatorData.lastName || ''}`.trim();
  return fullName || coordinatorData.email || authUser?.email || 'Coordinator';
}

function getCoordinatorProfileInitials(coordinatorData, authUser) {
  const firstInitial = String(coordinatorData.firstName || '').trim().charAt(0);
  const lastInitial = String(coordinatorData.lastName || '').trim().charAt(0);
  const initials = `${firstInitial}${lastInitial}`.toUpperCase();

  if (initials) {
    return initials;
  }

  const emailInitial = String(coordinatorData.email || authUser?.email || '').trim().charAt(0).toUpperCase();
  return emailInitial || 'C';
}

function splitCoordinatorProfileFullName(fullName) {
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

function showCoordinatorProfileStatus(message, type = 'success') {
  const statusElement = document.getElementById('coordinatorProfileStatus');
  if (!statusElement) {
    return;
  }

  statusElement.hidden = false;
  statusElement.className = `profile-save-status ${type}`;
  statusElement.textContent = message;
}

function updateCoordinatorProfileView(coordinatorData, authUser, stats) {
  const fullName = getCoordinatorProfileDisplayName(coordinatorData, authUser);
  const program = String(coordinatorData.programManaged || coordinatorData.program || '').trim();
  const subtitle = program ? `Coordinator, ${program}` : 'Coordinator account';
  const primaryEmail = coordinatorData.email || authUser?.email || '';
  const contactEmail = coordinatorData.contactEmail || primaryEmail;
  const officeLocation = coordinatorData.officeLocation || '';
  const coordinatorId = coordinatorData.coordinatorId || authUser?.uid || '';
  const department = coordinatorData.department || 'Not available';
  const availability = coordinatorData.availability || 'Not available';

  const avatarElement = document.getElementById('coordinatorProfileAvatar');
  const headingNameElement = document.getElementById('coordinatorProfileHeadingName');
  const headingSubtitleElement = document.getElementById('coordinatorProfileHeadingSubtitle');
  const studentCountElement = document.getElementById('coordinatorProfileStudentCount');
  const emailVerifiedElement = document.getElementById('coordinatorProfileEmailVerified');
  const employerCountElement = document.getElementById('coordinatorProfileEmployerCount');
  const coordinatorIdElement = document.getElementById('coordinatorProfileCoordinatorId');
  const departmentElement = document.getElementById('coordinatorProfileDepartment');
  const availabilityElement = document.getElementById('coordinatorProfileAvailability');

  if (avatarElement) {
    avatarElement.textContent = getCoordinatorProfileInitials(coordinatorData, authUser);
  }

  if (headingNameElement) {
    headingNameElement.textContent = fullName;
  }

  if (headingSubtitleElement) {
    headingSubtitleElement.textContent = subtitle;
  }

  if (studentCountElement) {
    studentCountElement.textContent = String(stats.studentCount);
  }

  if (emailVerifiedElement) {
    emailVerifiedElement.textContent = authUser?.emailVerified ? 'Yes' : 'No';
  }

  if (employerCountElement) {
    employerCountElement.textContent = String(stats.employerCount);
  }

  if (coordinatorIdElement) {
    coordinatorIdElement.textContent = coordinatorId || 'Not available';
  }

  if (departmentElement) {
    departmentElement.textContent = department;
  }

  if (availabilityElement) {
    availabilityElement.textContent = availability;
  }

  const fullNameInput = document.getElementById('coordinatorFullName');
  const primaryEmailInput = document.getElementById('coordinatorPrimaryEmail');
  const contactEmailInput = document.getElementById('coordinatorContactEmail');
  const programInput = document.getElementById('coordinatorProgram');
  const officeInput = document.getElementById('coordinatorOffice');
  const studentsInput = document.getElementById('coordinatorStudents');

  if (fullNameInput) {
    fullNameInput.value = fullName;
  }

  if (primaryEmailInput) {
    primaryEmailInput.value = primaryEmail;
  }

  if (contactEmailInput) {
    contactEmailInput.value = contactEmail;
  }

  if (programInput) {
    programInput.value = program;
  }

  if (officeInput) {
    officeInput.value = officeLocation;
  }

  if (studentsInput) {
    studentsInput.value = String(stats.studentCount);
  }
}

async function loadCoordinatorProfileContext() {
  const authUser = await getCurrentCoordinatorProfileUser();
  if (!authUser) {
    throw new Error('You must be signed in to view this profile.');
  }

  const userRef = firebase.firestore().collection(COORDINATOR_PROFILE_USER_COLLECTION).doc(authUser.uid);
  const [userDoc, assignedStudentsSnapshot, employersSnapshot] = await Promise.all([
    userRef.get(),
    firebase.firestore()
      .collection(COORDINATOR_PROFILE_USER_COLLECTION)
      .where('role', '==', 'student')
      .where('assignedCoordinatorId', '==', authUser.uid)
      .get(),
    firebase.firestore()
      .collection(COORDINATOR_PROFILE_USER_COLLECTION)
      .where('role', '==', 'employer')
      .get()
  ]);

  return {
    authUser,
    coordinatorData: userDoc.exists ? userDoc.data() : {},
    stats: {
      studentCount: assignedStudentsSnapshot.size,
      employerCount: employersSnapshot.size
    }
  };
}

window.initializeCoordinatorProfilePage = function() {
  const saveButton = document.getElementById('saveProfile');
  const fullNameInput = document.getElementById('coordinatorFullName');
  const contactEmailInput = document.getElementById('coordinatorContactEmail');
  const programInput = document.getElementById('coordinatorProgram');
  const officeInput = document.getElementById('coordinatorOffice');

  if (!saveButton || !fullNameInput || !contactEmailInput || !programInput || !officeInput) {
    return;
  }

  if (saveButton.dataset.coordinatorProfileBound === 'true') {
    return;
  }

  saveButton.dataset.coordinatorProfileBound = 'true';

  [fullNameInput, contactEmailInput, programInput, officeInput].forEach((element) => {
    element.addEventListener('input', () => {
      const statusElement = document.getElementById('coordinatorProfileStatus');
      if (statusElement) {
        statusElement.hidden = true;
      }
    });
  });

  const state = {
    authUser: null,
    coordinatorData: {},
    stats: {
      studentCount: 0,
      employerCount: 0
    }
  };

  const loadProfile = async () => {
    saveButton.disabled = true;

    try {
      const context = await loadCoordinatorProfileContext();
      state.authUser = context.authUser;
      state.coordinatorData = context.coordinatorData;
      state.stats = context.stats;
      updateCoordinatorProfileView(state.coordinatorData, state.authUser, state.stats);
    } catch (error) {
      console.error('Unable to load coordinator profile:', error);
      showCoordinatorProfileStatus(error.message || 'Unable to load your profile right now.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  };

  saveButton.addEventListener('click', async () => {
    const parsedName = splitCoordinatorProfileFullName(fullNameInput.value);
    const firstName = parsedName.firstName;
    const lastName = parsedName.lastName;
    const contactEmail = contactEmailInput.value.trim();
    const programManaged = programInput.value.trim();
    const officeLocation = officeInput.value.trim();

    if (!firstName) {
      showCoordinatorProfileStatus('Enter your full name before saving.', 'error');
      fullNameInput.focus();
      return;
    }

    if (!state.authUser) {
      showCoordinatorProfileStatus('Unable to save your profile right now.', 'error');
      return;
    }

    saveButton.disabled = true;

    try {
      const update = {
        firstName,
        lastName,
        contactEmail,
        programManaged,
        officeLocation,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await firebase.firestore()
        .collection(COORDINATOR_PROFILE_USER_COLLECTION)
        .doc(state.authUser.uid)
        .set(update, { merge: true });

      state.coordinatorData = {
        ...state.coordinatorData,
        ...update
      };

      updateCoordinatorProfileView(state.coordinatorData, state.authUser, state.stats);
      showCoordinatorProfileStatus('Coordinator profile updated.', 'success');
    } catch (error) {
      console.error('Unable to save coordinator profile:', error);
      showCoordinatorProfileStatus('Unable to save your profile right now.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  loadProfile();
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('coordinatorFullName')) {
    window.initializeCoordinatorProfilePage();
  }
});
