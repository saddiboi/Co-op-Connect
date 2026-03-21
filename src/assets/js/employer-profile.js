const EMPLOYER_PROFILE_USER_COLLECTION = 'users';
const EMPLOYER_PROFILE_REPORT_COLLECTION = 'workTermReports';

function getCurrentEmployerProfileUser() {
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

function getEmployerProfileTimestampDate(value) {
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

function getEmployerProfileDisplayName(employerData, authUser) {
  return employerData.companyName
    || `${employerData.firstName || ''} ${employerData.lastName || ''}`.trim()
    || employerData.email
    || authUser?.email
    || 'Employer';
}

function getEmployerProfileAccountName(employerData, authUser) {
  const fullName = `${employerData.firstName || ''} ${employerData.lastName || ''}`.trim();
  return fullName || employerData.contactName || employerData.email || authUser?.email || 'Employer';
}

function getEmployerProfileInitials(employerData, authUser) {
  const source = employerData.companyName || getEmployerProfileAccountName(employerData, authUser);
  const parts = String(source || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
  return initials || 'E';
}

function splitEmployerProfileFullName(fullName) {
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

function setEmployerProfileSelectValue(selectElement, value) {
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

function showEmployerProfileStatus(message, type = 'success') {
  const statusElement = document.getElementById('employerProfileStatus');
  if (!statusElement) {
    return;
  }

  statusElement.hidden = false;
  statusElement.className = `profile-save-status ${type}`;
  statusElement.textContent = message;
}

function formatEmployerProfilePartnerSince(createdAt) {
  const createdDate = getEmployerProfileTimestampDate(createdAt);
  return createdDate ? String(createdDate.getFullYear()) : 'Not available';
}

function updateEmployerProfileView(employerData, authUser, stats) {
  const companyName = employerData.companyName || 'Employer Company';
  const accountName = getEmployerProfileAccountName(employerData, authUser);
  const industry = String(employerData.industry || '').trim();
  const subtitle = industry ? `${industry} employer partner` : 'Employer account';
  const accountEmail = employerData.email || authUser?.email || '';
  const contactEmail = employerData.contactEmail || accountEmail;
  const website = employerData.website || '';
  const headOffice = employerData.headOffice || '';
  const openPositions = Math.max(0, Number(employerData.openPositions) || 0);
  const partnerSince = formatEmployerProfilePartnerSince(employerData.createdAt);
  const jobTitle = employerData.jobTitle || '';
  const placementsLabel = `${stats.studentPlacements} completed term${stats.studentPlacements === 1 ? '' : 's'}`;

  const avatarElement = document.getElementById('employerProfileAvatar');
  const headingNameElement = document.getElementById('employerProfileHeadingName');
  const headingSubtitleElement = document.getElementById('employerProfileHeadingSubtitle');
  const accountStatusElement = document.getElementById('employerProfileAccountStatus');
  const emailVerifiedElement = document.getElementById('employerProfileEmailVerified');
  const openPositionsStatElement = document.getElementById('employerProfileOpenPositionsStat');
  const partnerSinceElement = document.getElementById('employerProfilePartnerSince');
  const headOfficeSummaryElement = document.getElementById('employerProfileHeadOfficeSummary');
  const studentPlacementsElement = document.getElementById('employerProfileStudentPlacements');

  if (avatarElement) {
    avatarElement.textContent = getEmployerProfileInitials(employerData, authUser);
  }

  if (headingNameElement) {
    headingNameElement.textContent = companyName;
  }

  if (headingSubtitleElement) {
    headingSubtitleElement.textContent = subtitle;
  }

  if (accountStatusElement) {
    accountStatusElement.textContent = employerData.accountStatus || 'Active';
  }

  if (emailVerifiedElement) {
    emailVerifiedElement.textContent = authUser?.emailVerified ? 'Yes' : 'No';
  }

  if (openPositionsStatElement) {
    openPositionsStatElement.textContent = String(openPositions);
  }

  if (partnerSinceElement) {
    partnerSinceElement.textContent = partnerSince;
  }

  if (headOfficeSummaryElement) {
    headOfficeSummaryElement.textContent = headOffice || 'Not available';
  }

  if (studentPlacementsElement) {
    studentPlacementsElement.textContent = placementsLabel;
  }

  const companyNameInput = document.getElementById('employerCompanyName');
  const industrySelect = document.getElementById('employerIndustry');
  const websiteInput = document.getElementById('employerWebsite');
  const headOfficeInput = document.getElementById('employerHeadOffice');
  const openPositionsInput = document.getElementById('employerOpenPositions');
  const partnerSinceInput = document.getElementById('employerPartnerSince');
  const accountNameInput = document.getElementById('employerAccountFullName');
  const accountEmailInput = document.getElementById('employerAccountEmail');
  const contactEmailInput = document.getElementById('employerContactEmail');
  const jobTitleInput = document.getElementById('employerJobTitle');

  if (companyNameInput) {
    companyNameInput.value = companyName;
  }

  setEmployerProfileSelectValue(industrySelect, industry);

  if (websiteInput) {
    websiteInput.value = website;
  }

  if (headOfficeInput) {
    headOfficeInput.value = headOffice;
  }

  if (openPositionsInput) {
    openPositionsInput.value = String(openPositions);
  }

  if (partnerSinceInput) {
    partnerSinceInput.value = partnerSince === 'Not available' ? '' : partnerSince;
  }

  if (accountNameInput) {
    accountNameInput.value = accountName;
  }

  if (accountEmailInput) {
    accountEmailInput.value = accountEmail;
  }

  if (contactEmailInput) {
    contactEmailInput.value = contactEmail;
  }

  if (jobTitleInput) {
    jobTitleInput.value = jobTitle;
  }
}

async function loadEmployerProfileContext() {
  const authUser = await getCurrentEmployerProfileUser();
  if (!authUser) {
    throw new Error('You must be signed in to view this profile.');
  }

  const userRef = firebase.firestore().collection(EMPLOYER_PROFILE_USER_COLLECTION).doc(authUser.uid);
  const [userDoc, assignedStudentsSnapshot, reportsSnapshot] = await Promise.all([
    userRef.get(),
    firebase.firestore()
      .collection(EMPLOYER_PROFILE_USER_COLLECTION)
      .where('role', '==', 'student')
      .where('assignedEmployerId', '==', authUser.uid)
      .get(),
    firebase.firestore().collection(EMPLOYER_PROFILE_REPORT_COLLECTION).get()
  ]);

  const assignedStudentIds = new Set(assignedStudentsSnapshot.docs.map((doc) => doc.id));
  const studentPlacements = reportsSnapshot.docs.reduce((count, doc) => {
    const report = doc.data();
    if (!assignedStudentIds.has(report.userId) || !report.reportUrl) {
      return count;
    }

    return count + 1;
  }, 0);

  return {
    authUser,
    employerData: userDoc.exists ? userDoc.data() : {},
    stats: {
      studentPlacements
    }
  };
}

window.initializeEmployerProfilePage = function() {
  const saveButton = document.getElementById('saveProfile');
  const companyNameInput = document.getElementById('employerCompanyName');
  const industrySelect = document.getElementById('employerIndustry');
  const websiteInput = document.getElementById('employerWebsite');
  const headOfficeInput = document.getElementById('employerHeadOffice');
  const openPositionsInput = document.getElementById('employerOpenPositions');
  const accountNameInput = document.getElementById('employerAccountFullName');
  const contactEmailInput = document.getElementById('employerContactEmail');
  const jobTitleInput = document.getElementById('employerJobTitle');

  if (
    !saveButton ||
    !companyNameInput ||
    !industrySelect ||
    !websiteInput ||
    !headOfficeInput ||
    !openPositionsInput ||
    !accountNameInput ||
    !contactEmailInput ||
    !jobTitleInput
  ) {
    return;
  }

  if (saveButton.dataset.employerProfileBound === 'true') {
    return;
  }

  saveButton.dataset.employerProfileBound = 'true';

  [
    companyNameInput,
    industrySelect,
    websiteInput,
    headOfficeInput,
    openPositionsInput,
    accountNameInput,
    contactEmailInput,
    jobTitleInput
  ].forEach((element) => {
    element.addEventListener('input', () => {
      const statusElement = document.getElementById('employerProfileStatus');
      if (statusElement) {
        statusElement.hidden = true;
      }
    });

    element.addEventListener('change', () => {
      const statusElement = document.getElementById('employerProfileStatus');
      if (statusElement) {
        statusElement.hidden = true;
      }
    });
  });

  const state = {
    authUser: null,
    employerData: {},
    stats: {
      studentPlacements: 0
    }
  };

  const loadProfile = async () => {
    saveButton.disabled = true;

    try {
      const context = await loadEmployerProfileContext();
      state.authUser = context.authUser;
      state.employerData = context.employerData;
      state.stats = context.stats;
      updateEmployerProfileView(state.employerData, state.authUser, state.stats);
    } catch (error) {
      console.error('Unable to load employer profile:', error);
      showEmployerProfileStatus(error.message || 'Unable to load your profile right now.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  };

  saveButton.addEventListener('click', async () => {
    const parsedName = splitEmployerProfileFullName(accountNameInput.value);
    const firstName = parsedName.firstName;
    const lastName = parsedName.lastName;
    const companyName = companyNameInput.value.trim();
    const industry = industrySelect.value.trim();
    const website = websiteInput.value.trim();
    const headOffice = headOfficeInput.value.trim();
    const openPositions = Math.max(0, Number(openPositionsInput.value) || 0);
    const contactEmail = contactEmailInput.value.trim();
    const jobTitle = jobTitleInput.value.trim();

    if (!companyName) {
      showEmployerProfileStatus('Enter a company name before saving.', 'error');
      companyNameInput.focus();
      return;
    }

    if (!firstName) {
      showEmployerProfileStatus('Enter the account user full name before saving.', 'error');
      accountNameInput.focus();
      return;
    }

    if (!state.authUser) {
      showEmployerProfileStatus('Unable to save your profile right now.', 'error');
      return;
    }

    saveButton.disabled = true;

    try {
      const update = {
        companyName,
        industry,
        website,
        headOffice,
        openPositions,
        contactEmail,
        jobTitle,
        firstName,
        lastName,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await firebase.firestore()
        .collection(EMPLOYER_PROFILE_USER_COLLECTION)
        .doc(state.authUser.uid)
        .set(update, { merge: true });

      state.employerData = {
        ...state.employerData,
        ...update
      };

      updateEmployerProfileView(state.employerData, state.authUser, state.stats);
      showEmployerProfileStatus('Employer profile updated.', 'success');
    } catch (error) {
      console.error('Unable to save employer profile:', error);
      showEmployerProfileStatus('Unable to save your profile right now.', 'error');
    } finally {
      saveButton.disabled = false;
    }
  });

  loadProfile();
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('employerCompanyName')) {
    window.initializeEmployerProfilePage();
  }
});
