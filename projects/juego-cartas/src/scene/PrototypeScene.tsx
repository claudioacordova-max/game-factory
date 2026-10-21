export default function PrototypeScene() {
  return (
    <>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[1.3, 1.3, 1.3]} />
        <meshStandardMaterial color="#6ee7b7" roughness={0.45} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#263449" roughness={0.9} />
      </mesh>
    </>
  )
}
