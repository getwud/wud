<template>
  <v-container fluid class="pa-4">
    <!-- Top Toolbar with Title, Search Filter & Add User Button -->
    <v-card class="border mb-4" elevation="0" rounded="lg">
      <v-toolbar color="surface" density="compact" class="px-3 py-1">
        <v-icon icon="mdi-account-group-outline" class="mr-2 text-primary" size="24"></v-icon>
        <div class="d-flex align-center">
          <span class="text-subtitle-1 font-weight-bold mr-2">User Management</span>
          <v-chip size="small" variant="tonal" color="primary">
            {{ users.length }} user{{ users.length > 1 ? 's' : '' }}
          </v-chip>
        </div>

        <v-spacer></v-spacer>

        <!-- Search Input -->
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search users..."
          density="compact"
          variant="outlined"
          hide-details
          clearable
          single-line
          class="mr-2"
          style="max-width: 240px;"
        ></v-text-field>

        <v-btn
          color="primary"
          prepend-icon="mdi-account-plus"
          size="small"
          rounded="lg"
          class="mr-2 text-none font-weight-bold"
          @click="openAddDialog"
        >
          Add User
        </v-btn>

        <v-btn
          icon="mdi-refresh"
          variant="text"
          size="small"
          @click="loadUsers"
          :loading="isLoading"
          title="Refresh"
        ></v-btn>
      </v-toolbar>
    </v-card>

    <!-- Users Table Card -->
    <v-card class="border" elevation="0" rounded="lg">
      <v-table hover density="comfortable">
        <thead>
          <tr>
            <th class="text-left font-weight-bold">User</th>
            <th class="text-left font-weight-bold">Role</th>
            <th class="text-left font-weight-bold">Provider</th>
            <th class="text-left font-weight-bold">Created</th>
            <th class="text-right font-weight-bold pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredUsers.length === 0">
            <td colspan="5" class="text-center py-6 text-medium-emphasis">
              <v-icon icon="mdi-account-search-outline" size="36" class="mb-2 opacity-50"></v-icon>
              <div>No users found.</div>
            </td>
          </tr>
          <tr v-for="user in filteredUsers" :key="user.id">
            <!-- Username with avatar -->
            <td class="py-3">
              <div class="d-flex align-center">
                <v-avatar color="primary" variant="tonal" size="32" class="mr-3 font-weight-bold text-caption">
                  {{ user.username.charAt(0).toUpperCase() }}
                </v-avatar>
                <div>
                  <div class="font-weight-bold">{{ user.username }}</div>
                  <div class="text-caption text-medium-emphasis">ID: {{ user.id }}</div>
                </div>
              </div>
            </td>

            <!-- Role badge -->
            <td>
              <v-chip
                size="small"
                :color="getRoleColor(user.role)"
                variant="flat"
                class="font-weight-bold text-uppercase"
              >
                {{ formatRole(user.role) }}
              </v-chip>
            </td>

            <!-- Provider badge -->
            <td>
              <v-chip
                size="small"
                variant="tonal"
                :prepend-icon="user.provider === 'oidc' ? 'mdi-openid' : 'mdi-lock-outline'"
              >
                {{ user.provider === 'oidc' ? 'OIDC' : 'Local' }}
              </v-chip>
            </td>

            <!-- Created at -->
            <td class="text-caption text-medium-emphasis">
              {{ formatDate(user.createdAt) }}
            </td>

            <!-- Actions -->
            <td class="text-right pr-4">
              <v-btn
                icon="mdi-pencil-outline"
                variant="text"
                size="small"
                color="primary"
                title="Edit user"
                class="mr-1"
                @click="openEditDialog(user)"
              ></v-btn>
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                color="error"
                title="Delete user"
                :disabled="isCurrentUser(user)"
                @click="openDeleteDialog(user)"
              ></v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Add User Dialog -->
    <v-dialog v-model="addDialog" max-width="480" persistent>
      <v-card rounded="lg" class="pa-2">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-account-plus" class="mr-2 text-primary"></v-icon>
          Create New User
        </v-card-title>
        <v-card-text>
          <v-form ref="addForm" v-model="addValid" @submit.prevent="submitAddUser">
            <v-text-field
              v-model="newUser.username"
              label="Username"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required]"
              class="mb-2"
              autofocus
            ></v-text-field>

            <v-text-field
              v-model="newUser.password"
              label="Password"
              type="password"
              prepend-inner-icon="mdi-lock"
              variant="outlined"
              density="comfortable"
              :rules="[rules.required, rules.minLength]"
              class="mb-2"
            ></v-text-field>

            <v-select
              v-model="newUser.role"
              :items="roleOptions"
              item-title="title"
              item-value="value"
              label="Role"
              prepend-inner-icon="mdi-shield-account"
              variant="outlined"
              density="comfortable"
              class="mb-2"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props" :subtitle="item.raw.subtitle"></v-list-item>
              </template>
            </v-select>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-4 pb-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="addDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="actionLoading"
            :disabled="!addValid"
            @click="submitAddUser"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit User Dialog -->
    <v-dialog v-model="editDialog" max-width="480" persistent>
      <v-card rounded="lg" class="pa-2" v-if="selectedUser">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-account-edit" class="mr-2 text-primary"></v-icon>
          Edit User {{ selectedUser.username }}
        </v-card-title>
        <v-card-text>
          <v-select
            v-model="editUserRole"
            :items="roleOptions"
            item-title="title"
            item-value="value"
            label="Role"
            prepend-inner-icon="mdi-shield-account"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props" :subtitle="item.raw.subtitle"></v-list-item>
            </template>
          </v-select>

          <v-alert
            v-if="selectedUser.provider === 'oidc'"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3 text-caption"
          >
            Note: If OIDC group mapping is configured in WUD, this role will be updated by the identity provider on next login.
          </v-alert>

          <v-text-field
            v-if="selectedUser.provider === 'local'"
            v-model="editUserPassword"
            label="Reset Password (leave empty to keep current)"
            type="password"
            prepend-inner-icon="mdi-lock-reset"
            variant="outlined"
            density="comfortable"
            hint="Enter a new password only if you want to reset it"
            persistent-hint
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="px-4 pb-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="editDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="actionLoading"
            @click="submitEditUser"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card rounded="lg" class="pa-2" v-if="selectedUser">
        <v-card-title class="text-error d-flex align-center">
          <v-icon icon="mdi-alert" class="mr-2 text-error"></v-icon>
          Delete User
        </v-card-title>
        <v-card-text>
          Are you sure you want to delete user <strong>{{ selectedUser.username }}</strong>?
          This action cannot be undone.
        </v-card-text>
        <v-card-actions class="px-4 pb-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="actionLoading"
            @click="submitDeleteUser"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, inject } from 'vue';
import { listUsers, createUser, updateUser, deleteUser, UserItem } from '@/services/user';
import { getUser } from '@/services/auth';

export default defineComponent({
  name: 'ConfigurationUsersView',
  setup() {
    const eventBus = inject('eventBus') as any;

    const users = ref<UserItem[]>([]);
    const currentUser = ref<any>(null);
    const search = ref('');
    const isLoading = ref(false);
    const actionLoading = ref(false);

    const addDialog = ref(false);
    const addValid = ref(false);
    const newUser = ref({
      username: '',
      password: '',
      role: 'ro' as 'admin' | 'rw' | 'ro',
    });

    const editDialog = ref(false);
    const selectedUser = ref<UserItem | null>(null);
    const editUserRole = ref<'admin' | 'rw' | 'ro'>('ro');
    const editUserPassword = ref('');

    const deleteDialog = ref(false);

    const roleOptions = [
      {
        value: 'admin',
        title: 'Administrator',
        subtitle: 'Full access to system, users, and all resources',
      },
      {
        value: 'rw',
        title: 'Read / Write',
        subtitle: 'Can trigger updates and modify containers & triggers',
      },
      {
        value: 'ro',
        title: 'Read Only',
        subtitle: 'Can view containers, triggers, and logs only',
      },
    ];

    const rules = {
      required: (v: string) => !!v || 'Required field',
      minLength: (v: string) => !v || v.length >= 6 || 'Minimum 6 characters',
    };

    const filteredUsers = computed(() => {
      if (!search.value) return users.value;
      const q = search.value.toLowerCase();
      return users.value.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.provider.toLowerCase().includes(q),
      );
    });

    const notify = (msg: string, level = 'info') => {
      eventBus?.emit('notify', msg, level);
    };

    const loadUsers = async () => {
      isLoading.value = true;
      try {
        users.value = await listUsers();
        currentUser.value = await getUser();
      } catch (e: any) {
        notify(e.message || 'Failed to load users', 'error');
      } finally {
        isLoading.value = false;
      }
    };

    const isCurrentUser = (user: UserItem) => {
      return currentUser.value && currentUser.value.id === user.id;
    };

    const getRoleColor = (role: string) => {
      switch (role) {
        case 'admin':
          return 'error';
        case 'rw':
          return 'primary';
        case 'ro':
        default:
          return 'grey-darken-1';
      }
    };

    const formatRole = (role: string) => {
      switch (role) {
        case 'admin':
          return 'Admin';
        case 'rw':
          return 'Read/Write';
        case 'ro':
        default:
          return 'Read-Only';
      }
    };

    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return 'N/A';
      try {
        return new Date(dateStr).toLocaleString();
      } catch {
        return dateStr;
      }
    };

    const openAddDialog = () => {
      newUser.value = { username: '', password: '', role: 'ro' };
      addDialog.value = true;
    };

    const submitAddUser = async () => {
      if (!newUser.value.username || !newUser.value.password) return;
      actionLoading.value = true;
      try {
        await createUser(newUser.value);
        notify(`User ${newUser.value.username} created successfully`, 'success');
        addDialog.value = false;
        await loadUsers();
      } catch (e: any) {
        notify(e.message || 'Failed to create user', 'error');
      } finally {
        actionLoading.value = false;
      }
    };

    const openEditDialog = (user: UserItem) => {
      selectedUser.value = user;
      editUserRole.value = user.role;
      editUserPassword.value = '';
      editDialog.value = true;
    };

    const submitEditUser = async () => {
      if (!selectedUser.value) return;
      actionLoading.value = true;
      try {
        const payload: { role?: 'admin' | 'rw' | 'ro'; password?: string } = {
          role: editUserRole.value,
        };
        if (editUserPassword.value) {
          payload.password = editUserPassword.value;
        }
        await updateUser(selectedUser.value.id, payload);
        notify(`User ${selectedUser.value.username} updated successfully`, 'success');
        editDialog.value = false;
        await loadUsers();
      } catch (e: any) {
        notify(e.message || 'Failed to update user', 'error');
      } finally {
        actionLoading.value = false;
      }
    };

    const openDeleteDialog = (user: UserItem) => {
      selectedUser.value = user;
      deleteDialog.value = true;
    };

    const submitDeleteUser = async () => {
      if (!selectedUser.value) return;
      actionLoading.value = true;
      try {
        await deleteUser(selectedUser.value.id);
        notify(`User ${selectedUser.value.username} deleted successfully`, 'success');
        deleteDialog.value = false;
        await loadUsers();
      } catch (e: any) {
        notify(e.message || 'Failed to delete user', 'error');
      } finally {
        actionLoading.value = false;
      }
    };

    onMounted(loadUsers);

    return {
      users,
      search,
      isLoading,
      actionLoading,
      filteredUsers,
      roleOptions,
      rules,
      addDialog,
      addValid,
      newUser,
      editDialog,
      selectedUser,
      editUserRole,
      editUserPassword,
      deleteDialog,
      getRoleColor,
      formatRole,
      formatDate,
      isCurrentUser,
      loadUsers,
      openAddDialog,
      submitAddUser,
      openEditDialog,
      submitEditUser,
      openDeleteDialog,
      submitDeleteUser,
    };
  },
});
</script>
