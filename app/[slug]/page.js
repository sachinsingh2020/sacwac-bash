import BirthdayExperience from '../../components/BirthdayExperience';

export default function BirthdayPage({ params }) {
  return <BirthdayExperience slug={params.slug} />;
}
