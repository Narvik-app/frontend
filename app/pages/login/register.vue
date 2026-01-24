<script setup lang="ts">
import type {FormError, SelectItem, SelectMenuItem, TabsItem} from '#ui/types'
import UserQuery from "~/composables/api/query/UserQuery";
import {isMobile, watchBreakpoint} from "~/utils/browser";
import type {NuxtTurnstile} from "#components";
import {useLoginUser} from "~/composables/api/api";
import {ClubActivity, getSelectMenuClubActivity} from "~/types/api/item/club";

const toast = useToast()
const isLoading = ref(false)
const securityEmailSent = ref(false)

const queryParams = useRoute().query

const state = reactive({
  turnstileToken: undefined as string|undefined,
  securityCode: queryParams.security_code ?? undefined as string|undefined,

  email: queryParams.email ? decodeURI(queryParams.email.toString()) : undefined as string|undefined,
  password: undefined as string|undefined,
  firstname: undefined as string|undefined,
  lastname: undefined as string|undefined,

  clubActivity: getSelectMenuClubActivity().find((item) => item?.value === ClubActivity.Generic) as SelectMenuItem|undefined,
  clubName: undefined as string|undefined,
  clubEmail: undefined as string|undefined,
  clubPhone: undefined as string|undefined,
  clubAddress: undefined as string|undefined,
  clubZipCode: undefined as number|undefined,
  clubCity: undefined as string|undefined,
  clubSiret: undefined as string|undefined,
  clubVat: undefined as string|undefined,

  legals: false,
})

const turnstile = ref<InstanceType<typeof NuxtTurnstile>>()
const requireTurnstile = useRuntimeConfig().public.clientTurnstile

const userQuery = new UserQuery()

const isMobileDisplay = isMobile()
const isHorizontal = ref(false)
watchEffect(() => {
  isHorizontal.value = !isMobileDisplay.value
})


const selected = ref(queryParams.security_code ? '1' : '0')
const items = ref<TabsItem[]>([
  {
    slot: 'initial' as const,
    label: 'Demande de création',
    icon: 'i-heroicons-lock-closed',
  }, {
    slot: 'create' as const,
    label: 'Validation et création',
    icon: 'i-heroicons-envelope-open',
  }
])

const accountTypes = ref([
  {
    label: 'Personnel',
    value: 'personal',
    icon: 'i-heroicons-user'
  },
  {
    label: 'Association',
    value: 'club',
    icon: 'i-heroicons-building-storefront'
  }
] satisfies SelectItem[])
const accountType = ref(queryParams.account_type ?? accountTypes.value[0]?.value)
const accountTypeIcon = computed(() => accountTypes.value.find(item => item.value === accountType.value)?.icon)
const alreadyAnAccount = ref(false)

const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.securityCode) errors.push({ name: 'securityCode', message: 'Champ requis' })
  if (!state.email) errors.push({ name: 'email', message: 'Champ requis' })

  if (accountType.value !== 'club' || !alreadyAnAccount.value) {
    if (!state.password || state.password.length < 8) errors.push({ name: 'password', message: 'Champ requis (8 caractères minimum)' })
    if (!state.firstname) errors.push({ name: 'firstname', message: 'Champ requis' })
    if (!state.lastname) errors.push({ name: 'lastname', message: 'Champ requis' })
  }

  if (!state.legals) errors.push({ name: 'legals', message: 'Vous devez accepter les conditions légales' })
  return errors
}

async function register() {
  if (!state.securityCode || !state.email || ( (accountType.value !== 'club' || !alreadyAnAccount.value) && (!state.password || !state.firstname || !state.lastname)) || !accountType.value) {
    return
  }

  isLoading.value = true
  const { error } = await userQuery.register({
    accountType: accountType.value.toString(),
    securityCode: state.securityCode.toString(),

    email: state.email,
    password: state.password,
    firstname: state.firstname,
    lastname: state.lastname,

    clubActivity: state.clubActivity?.value.toString() ?? ClubActivity.Generic,
    clubName: state.clubName,
    clubEmail: state.clubEmail,
    clubPhone: state.clubPhone,
    clubAddress: state.clubAddress,
    clubZipCode: state.clubZipCode,
    clubCity: state.clubCity,
    clubSiret: state.clubSiret,
    clubVat: state.clubVat,
  })
  isLoading.value = false

  if (error) {
    toast.add({
      color: "error",
      title: "Impossible d'effectuer la création du compte.",
      description: error.message
    });
    return;
  }

  toast.add({
    title: "Le compte a été créé",
  });

  // We log the user directly
  if (state.password) {
    const { error } = await useLoginUser(state.email, state.password);
    if (!error) {
      if (accountType.value === 'club') {
        navigateTo('/admin')
      } else {
        navigateTo('/')
      }
      return
    }
  }

  navigateTo('/login');
}

async function initiateRegister() {
  if (!state.email || !accountType.value) {
    return
  }

  if (requireTurnstile && !state.turnstileToken) {
    turnstile.value?.reset()
    return
  }

  isLoading.value = true
  const { error } = await userQuery.registerInitialise(accountType.value, state.email, state.turnstileToken)
  isLoading.value = false
  turnstile.value?.reset()

  if (error) {
    toast.add({
      color: "error",
      title: "Impossible d'effectuer la demande de création.",
      description: error.message
    });
    return;
  }

  toast.add({
    color: "success",
    title: "Un code de vérification a été envoyé par mail",
  });

  selected.value = '1'
  securityEmailSent.value = true
}

onMounted(() => {
  watchBreakpoint()
  window.addEventListener('resize', watchBreakpoint)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', watchBreakpoint)
})
</script>

<template>
  <div>


    <UCard>
      <UTabs v-model="selected" :items="items">
        <template #initial>
            <UForm :state="state" class="space-y-4" @submit="initiateRegister">
              <UFormField label="Type de compte" name="accountType">
                <USelect v-model="accountType" :items="accountTypes" value-key="value" :icon="accountTypeIcon" />
              </UFormField>

              <UFormField label="Email" name="email" :description="accountType === 'club' ? 'Email de votre compte de connexion personnel.' : ''">
                <UInput v-model="state.email" type="email" />
              </UFormField>

              <NuxtTurnstile v-if="requireTurnstile" ref="turnstile" v-model="state.turnstileToken" />

              <UButton type="submit" :loading="isLoading">
                Créer le compte
              </UButton>
            </UForm>
        </template>

        <template #create>
          <UAlert
v-if="securityEmailSent"
            icon="i-heroicons-megaphone"
            color="success"
            variant="soft"
            title="Un email contenant le code de sécurité vous a été envoyé."
            description="Celui-ci peut se trouver dans votre dossier SPAM."
          />
          <UForm :state="state" class="space-y-4 mt-4" :validate="validate" @submit="register">
            <UFormField label="Code de sécurité" name="securityCode" help="En cas de code invalide, un nouveau sera envoyé. Seul le dernier code de sécurité reçu est valide." required>
              <UInput v-model.trim="state.securityCode" />
            </UFormField>

            <UFormField label="Type de compte" name="accountType">
              <USelect v-model="accountType" :items="accountTypes" value-key="value" :icon="accountTypeIcon" />
            </UFormField>

            <template v-if="accountType === 'club'">
              <USeparator  label="Informations personnel" />

              <UFormField label="J'ai déjà un compte">
                <USwitch v-model="alreadyAnAccount"/>
              </UFormField>
            </template>

            <UFormField label="Email" name="email" required>
              <UInput v-model.trim="state.email" type="email" />
            </UFormField>

            <UFormField v-if="accountType !== 'club' || !alreadyAnAccount" label="Mot de passe" name="password" required>
              <UInput v-model="state.password" type="password" />
            </UFormField>

            <UFormField v-if="accountType !== 'club' || !alreadyAnAccount" label="Nom" name="lastname" required>
              <UInput v-model="state.lastname" />
            </UFormField>

            <UFormField v-if="accountType !== 'club' || !alreadyAnAccount" label="Prénom" name="firstname" required>
              <UInput v-model="state.firstname" />
            </UFormField>

            <template v-if="accountType === 'club'">
              <USeparator label="Informations sur l'association" />

              <UFormField label="Activité principale">
                <template #description>
                  <p>Si votre activité n'est pas listée, veuillez sélectionner "Global".</p>
                </template>

                <USelectMenu v-model="state.clubActivity" :items="getSelectMenuClubActivity()" />

                <template #help>
                  <p v-if="state.clubActivity?.value === ClubActivity.Generic">Vous ne trouvez pas votre activité ? Aucun souci : <ContentLink to="https://about.narvik.app/contact" target="_blank">écrivez-nous</ContentLink> et nous l’intégrerons rapidement.</p>
                  <p v-if="state.clubActivity?.value === ClubActivity.SPORT_OTHER">Votre activité sportive n'est pas listée ? Aucun souci : <ContentLink to="https://about.narvik.app/contact" target="_blank">écrivez-nous</ContentLink> et nous l’intégrerons rapidement.</p>
                </template>
              </UFormField>

              <UFormField label="Nom de l'association" name="clubName" required>
                <UInput v-model="state.clubName" />
              </UFormField>
              <UFormField label="Email" description="Utilisé principalement pour la facturation." name="clubEmail" required>
                <UInput v-model.trim="state.clubEmail" type="email" />
              </UFormField>
              <UFormField label="Téléphone" name="clubPhone">
                <UInput v-model="state.clubPhone" />
              </UFormField>
              <UFormField label="Adresse" name="address" required>
                <UInput v-model="state.clubAddress" />
              </UFormField>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <UFormField label="Code postal" name="zipCode" required>
                  <UInput v-model="state.clubZipCode" />
                </UFormField>
                <UFormField label="Ville" name="city" required>
                  <UInput v-model="state.clubCity" />
                </UFormField>
              </div>
              <UFormField label="Siret" name="siret">
                <UInput v-model="state.clubSiret" />
              </UFormField>
              <UFormField label="TVA" name="vat">
                <UInput v-model="state.clubVat" />
              </UFormField>

            </template>

            <UFormField required name="legals">
              <UCheckbox v-model="state.legals" required>
                <template #label>
                  J'accepte les <ContentLink target="_blank" to="https://about.narvik.app/documents-legaux/cgu">Conditions Générales d’Utilisation</ContentLink>, les <ContentLink target="_blank" to="https://about.narvik.app/documents-legaux/cgv">Conditions Générales de Vente</ContentLink> et la <ContentLink target="_blank" to="https://about.narvik.app/documents-legaux/rgpd">Politique de confidentialité</ContentLink>
                </template>
              </UCheckbox>
            </UFormField>

            <div class="flex justify-between">
              <UButton type="submit" :loading="isLoading" block>
                Créer le compte
              </UButton>
            </div>
          </UForm>
        </template>
      </UTabs>

      <div class="text-xs mt-2">
        En cliquant sur Créer le compte, je déclare avoir pris connaissance de notre <ContentLink target="_blank" to="https://about.narvik.app/documents-legaux/rgpd">Politique de confidentialité</ContentLink> ainsi que de nos <ContentLink target="_blank" to="https://about.narvik.app/documents-legaux/cgu">Conditions Générales d’Utilisation</ContentLink> (CGU).
      </div>
    </UCard>
  </div>
</template>

<style lang="css" scoped>

</style>
